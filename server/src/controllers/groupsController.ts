import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all groups for current user
export const getGroups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: groups, error } = await db
      .from('group_members')
      .select(`
        groups (
          group_id,
          name,
          description,
          created_by,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// Get single group by ID
export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is member of group
    const { data: membership } = await db
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get group details
    const { data: group, error } = await db
      .from('groups')
      .select('*')
      .eq('group_id', id)
      .single();

    if (error || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get all members
    const { data: members } = await db
      .from('group_members')
      .select(`
        user_id,
        joined_at,
        users (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('group_id', id)
      .eq('is_active', true);

    res.json({ group, members });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

// Create new group
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    // Create group
    const { data: group, error: groupError } = await db
      .from('groups')
      .insert({
        name,
        description,
        created_by: userId,
      })
      .select()
      .single();

    if (groupError) {
      console.error('Database error:', groupError);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    // Add creator as member
    const { error: memberError } = await db.from('group_members').insert({
      group_id: group.group_id,
      user_id: userId,
      is_active: true,
    });

    if (memberError) {
      console.error('Database error:', memberError);
      return res.status(500).json({ error: 'Failed to add member' });
    }

    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

// Update group
export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    // Check if user is creator
    const { data: group } = await db
      .from('groups')
      .select('created_by')
      .eq('group_id', id)
      .single();

    if (!group || group.created_by !== userId) {
      return res.status(403).json({ error: 'Only group creator can update' });
    }

    // Update group
    const { data: updatedGroup, error } = await db
      .from('groups')
      .update({ name, description })
      .eq('group_id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update group' });
    }

    res.json({ group: updatedGroup });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

// Delete group
export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is creator
    const { data: group } = await db
      .from('groups')
      .select('created_by')
      .eq('group_id', id)
      .single();

    if (!group || group.created_by !== userId) {
      return res.status(403).json({ error: 'Only group creator can delete' });
    }

    // Delete group (cascade will handle members, expenses, etc.)
    const { error } = await db.from('groups').delete().eq('group_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete group' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

// Send invite to join group
export const inviteToGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const userId = req.user?.id;

    // Check if current user is member
    const { data: membership } = await db
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Find user by email
    const { data: invitedUser, error: userError } = await db
      .from('users')
      .select('user_id, email, name')
      .eq('email', email)
      .single();

    if (userError || !invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const { data: existingMember } = await db
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', invitedUser.user_id)
      .eq('is_active', true)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'User already in group' });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await db
      .from('group_invites')
      .select('*')
      .eq('group_id', id)
      .eq('invited_user', invitedUser.user_id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already sent' });
    }

    // Create invite
    const { data: invite, error: inviteError } = await db
      .from('group_invites')
      .insert({
        group_id: id,
        invited_by: userId,
        invited_user: invitedUser.user_id,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Database error:', inviteError);
      return res.status(500).json({ error: 'Failed to send invite' });
    }

    res.status(201).json({ message: 'Invite sent successfully', invite });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
};

// Get pending invites for current user
export const getMyInvites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: invites, error } = await db
      .from('group_invites')
      .select(`
        invite_id,
        group_id,
        invited_by,
        status,
        created_at,
        groups (
          group_id,
          name,
          description
        ),
        inviter:users!group_invites_invited_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch invites' });
    }

    res.json({ invites });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

// Accept group invite
export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    // Get invite
    const { data: invite, error: inviteError } = await db
      .from('group_invites')
      .select('*')
      .eq('invite_id', inviteId)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Add user to group
    const { error: memberError } = await db.from('group_members').insert({
      group_id: invite.group_id,
      user_id: userId,
      is_active: true,
    });

    if (memberError) {
      console.error('Database error:', memberError);
      return res.status(500).json({ error: 'Failed to join group' });
    }

    // Update invite status
    await db
      .from('group_invites')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('invite_id', inviteId);

    res.json({ message: 'Invite accepted successfully' });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

// Decline group invite
export const declineInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.id;

    // Get invite
    const { data: invite, error: inviteError } = await db
      .from('group_invites')
      .select('*')
      .eq('invite_id', inviteId)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Update invite status
    await db
      .from('group_invites')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('invite_id', inviteId);

    res.json({ message: 'Invite declined' });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({ error: 'Failed to decline invite' });
  }
};

// Legacy function - kept for backwards compatibility but deprecated
export const addMember = inviteToGroup;

// Remove member from group
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: memberUserId } = req.params;
    const currentUserId = req.user?.id;

    // Check if current user is creator
    const { data: group } = await db
      .from('groups')
      .select('created_by')
      .eq('group_id', id)
      .single();

    if (!group || group.created_by !== currentUserId) {
      return res.status(403).json({ error: 'Only group creator can remove members' });
    }

    // Can't remove creator
    if (memberUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove group creator' });
    }

    // Delete all expenses in this group created by or paid by this member
    const { error: expenseError } = await db
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('group_id', id)
      .or(`created_by.eq.${memberUserId},paid_by.eq.${memberUserId}`);

    if (expenseError) {
      console.error('Expense deletion error:', expenseError);
      return res.status(500).json({ error: 'Failed to remove member expenses' });
    }

    // Soft delete - set is_active to false
    const { error } = await db
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', id)
      .eq('user_id', memberUserId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    res.json({ message: 'Member removed successfully (including their expenses)' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};