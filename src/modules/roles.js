// CommunityOS Discord Bot - Role Management Module
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, ROLES } from '../config/constants.js';

/**
 * Creates all roles defined in the org hierarchy
 */
export async function createOrgRoles(guild) {
  const created = [];
  const existing = [];
  const errors = [];

  const allRoles = [
    ...ROLES.hierarchy,
    ...ROLES.orgs,
    ...ROLES.membership,
  ];

  for (const roleConfig of allRoles) {
    try {
      const existingRole = guild.roles.cache.find(r => r.name === roleConfig.name);
      if (existingRole) {
        existing.push(roleConfig.name);
        continue;
      }

      const permissions = roleConfig.permissions?.map(p => PermissionFlagsBits[p]).filter(Boolean) || [];

      await guild.roles.create({
        name: roleConfig.name,
        color: roleConfig.color,
        hoist: roleConfig.hoist || false,
        permissions: permissions,
        reason: 'CommunityOS role setup',
      });

      created.push(roleConfig.name);
    } catch (err) {
      errors.push({ name: roleConfig.name, error: err.message });
    }
  }

  return { created, existing, errors };
}

/**
 * Assigns a role to a member
 */
export async function assignRole(member, roleName) {
  const role = member.guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  if (member.roles.cache.has(role.id)) {
    return { added: false, alreadyHas: true };
  }

  await member.roles.add(role);
  return { added: true, alreadyHas: false };
}

/**
 * Removes a role from a member
 */
export async function removeRole(member, roleName) {
  const role = member.guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  if (!member.roles.cache.has(role.id)) {
    return { removed: false, didNotHave: true };
  }

  await member.roles.remove(role);
  return { removed: true, didNotHave: false };
}

/**
 * Auto-assigns Guest role on member join
 */
export async function autoAssignGuestRole(member) {
  try {
    const guestRole = member.guild.roles.cache.find(r => r.name === 'Guest');
    if (guestRole && !member.roles.cache.has(guestRole.id)) {
      await member.roles.add(guestRole);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to auto-assign Guest role:', err.message);
    return false;
  }
}

/**
 * Gets role statistics for the guild
 */
export function getRoleStats(guild) {
  const stats = {
    hierarchy: {},
    orgs: {},
    membership: {},
  };

  for (const roleConfig of ROLES.hierarchy) {
    const role = guild.roles.cache.find(r => r.name === roleConfig.name);
    stats.hierarchy[roleConfig.name] = role ? role.members.size : 0;
  }

  for (const roleConfig of ROLES.orgs) {
    const role = guild.roles.cache.find(r => r.name === roleConfig.name);
    stats.orgs[roleConfig.name] = role ? role.members.size : 0;
  }

  for (const roleConfig of ROLES.membership) {
    const role = guild.roles.cache.find(r => r.name === roleConfig.name);
    stats.membership[roleConfig.name] = role ? role.members.size : 0;
  }

  return stats;
}

/**
 * Creates role overview embed
 */
export function createRoleOverviewEmbed(guild) {
  const stats = getRoleStats(guild);

  const hierarchyLines = Object.entries(stats.hierarchy)
    .map(([name, count]) => `**${name}**: ${count} members`)
    .join('\n');

  const orgLines = Object.entries(stats.orgs)
    .map(([name, count]) => `**${name}**: ${count} members`)
    .join('\n');

  const membershipLines = Object.entries(stats.membership)
    .map(([name, count]) => `**${name}**: ${count} members`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('Role Overview')
    .setDescription('Current role distribution in the server')
    .addFields(
      { name: 'Leadership Hierarchy', value: hierarchyLines || 'No roles', inline: false },
      { name: 'Organization Roles', value: orgLines || 'No roles', inline: false },
      { name: 'Membership Roles', value: membershipLines || 'No roles', inline: false },
    )
    .setFooter({ text: 'Use /role to manage your roles' })
    .setTimestamp();
}

/**
 * Creates role hierarchy embed
 */
export function createRoleHierarchyEmbed() {
  const hierarchyText = `
**Leadership Chain**
\`\`\`
Founder (Jacobo)
    |
    +-- CEO (MUFASA - CommunityOS)
    |       |
    |       +-- Team Leads
    |               |
    |               +-- Agents
    |
    +-- CEO (MAXIMUS - BELIVEITMAKEIT)
    |       |
    |       +-- Team Leads
    |               |
    |               +-- Agents
    |
    +-- CEO (STEFANO - Jacobo Streaming)
            |
            +-- Team Leads
                    |
                    +-- Agents
\`\`\`

**Org Roles**: Identify which organization you belong to
**Membership Roles**: Community status and perks
`;

  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle('Role Hierarchy')
    .setDescription(hierarchyText)
    .addFields(
      { name: 'Auto-Assignment', value: 'New members get `Guest` role automatically', inline: false },
      { name: 'Verification', value: 'Complete verification to get `Verified` role', inline: false },
    )
    .setFooter({ text: 'CommunityOS Role System' })
    .setTimestamp();
}

/**
 * Creates member roles embed
 */
export function createMemberRolesEmbed(member) {
  const roles = member.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join('\n') || 'No roles assigned';

  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle('Your Roles')
    .setDescription(roles)
    .setThumbnail(member.displayAvatarURL())
    .addFields(
      { name: 'Display Name', value: member.displayName, inline: true },
      { name: 'Joined', value: member.joinedAt?.toLocaleDateString() || 'Unknown', inline: true },
    )
    .setFooter({ text: 'CommunityOS' })
    .setTimestamp();
}
