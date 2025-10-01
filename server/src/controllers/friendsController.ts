import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all friends (including blocked)
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: friends, error } = await db
      .from('friends')
      .select(`
        *,
        friend:users!friends_friend_id_fkey (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch friends' });
    }

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

// Get pending friend requests
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Incoming requests (where user is the friend_id)
    const { data: incoming, error: incomingError } = await db
      .from('friends')
      .select(`
        *,
        requester:users!friends_user_id_fkey (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    // Outgoing requests (where user is the user_id)
    const { data: outgoing, error: outgoingError } = await db
      .from('friends')
      .select(`
        *,
        friend:users!friends_friend_id_fkey (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (incomingError || outgoingError) {
      console.error('Database error');
      return res.status(500).json({ error: 'Failed to fetch pending requests' });
    }

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};

// Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    const userId = req.user?.id;

    // Find friend by email
    const { data: friend, error: friendError } = await db
      .from('users')
      .select('user_id, deleted_at')
      .eq('email', email)
      .single();

    // If user not found, send email invite
    if (friendError || !friend) {
      const { data: currentUser } = await db
        .from('users')
        .select('name')
        .eq('user_id', userId)
        .single();

      // Check for existing email invite
      const { data: existingInvite } = await db
        .from('email_invites')
        .select('*')
        .eq('email', email)
        .eq('invite_type', 'friend')
        .eq('invited_by', userId)
        .single();

      if (!existingInvite) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { data: invite } = await db
          .from('email_invites')
          .insert({
            email,
            invited_by: userId,
            invite_type: 'friend',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        // Send email
        const { sendFriendInviteEmail } = await import('../services/email');
        await sendFriendInviteEmail(email, currentUser?.name || 'Someone', invite.token);
      }

      return res.status(201).json({ message: 'Invitation sent via email' });
    }

    // Check if deleted
    if (friend.deleted_at) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Can't friend yourself
    if (friend.user_id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    // Check if friendship already exists
    const { data: existing } = await db
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friend.user_id}),and(user_id.eq.${friend.user_id},friend_id.eq.${userId})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already sent' });
      }
      if (existing.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request' });
      }
    }

    // Create friend request
    const { data: friendRequest, error } = await db
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friend.user_id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    res.status(201).json({ message: 'Friend request sent', friendRequest });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // friend request ID (user_id of requester)
    const userId = req.user?.id;

    // Find the friend request where user is the friend_id
    const { data: friendRequest, error: findError } = await db
      .from('friends')
      .select('*')
      .eq('user_id', id)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .single();

    if (findError || !friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update to accepted
    const { error: updateError } = await db
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', id)
      .eq('friend_id', userId);

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to accept friend request' });
    }

    // Create reciprocal friendship
    await db.from('friends').insert({
      user_id: userId,
      friend_id: id,
      status: 'accepted',
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

// Block friend
export const blockFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // friend user_id
    const userId = req.user?.id;

    // Update friendship status to blocked
    const { error } = await db
      .from('friends')
      .update({ status: 'blocked' })
      .eq('user_id', userId)
      .eq('friend_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to block user' });
    }

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block friend error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

// Unblock friend
export const unblockFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // friend user_id
    const userId = req.user?.id;

    // Update friendship status back to accepted
    const { error } = await db
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', userId)
      .eq('friend_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to unblock user' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock friend error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

// Remove friend
export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // friend user_id
    const userId = req.user?.id;

    // Delete both directions of friendship
    const { error } = await db
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${userId})`);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to remove friend' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};