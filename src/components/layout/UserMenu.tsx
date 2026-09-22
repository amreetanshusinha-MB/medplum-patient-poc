// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { getDisplayString } from '@medplum/core';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { SEMANTIC } from '../../theme';

/** Initials from an arbitrary display string. */
function initialsOf(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join('').toUpperCase() || '?';
}

/** Header account control: who is signed in, and how to sign out. */
export function UserMenu(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const navigate = useNavigate();

  if (!profile) {
    return null;
  }

  const label = getDisplayString(profile);

  function handleSignOut(): void {
    medplum
      .signOut()
      .then(() => navigate('/'))
      .catch(console.error);
  }

  return (
    <Menu shadow="md" width={220} position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton
          aria-label="Account menu"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            color: 'var(--care-text-on-primary)',
          }}
        >
          <Group gap="xs" wrap="nowrap">
            {/* White circle, brand-blue initials: 6.70:1. Accent on white is only 2.77:1. */}
            <Avatar size={28} radius="xl" color="brand" variant="white">
              {initialsOf(label)}
            </Avatar>
            <Text size="sm" fw={500} c="white" visibleFrom="sm" style={{ maxWidth: 160 }} truncate>
              {label}
            </Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled style={{ opacity: 1 }}>
          <Text size="sm" fw={500} truncate>
            {label}
          </Text>
          <Text size="xs" c="dimmed">
            {profile.resourceType}
          </Text>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color={SEMANTIC.error} leftSection={<IconLogout size={16} />} onClick={handleSignOut}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
