// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { AppShell, Box, Burger, Group, NavLink, ScrollArea, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router';
import { LAYOUT } from '../../theme';
import { BrandMark } from '../ui/BrandMark';
import { GlobalPatientSearch } from './GlobalPatientSearch';
import { UserMenu } from './UserMenu';

interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: ReactNode;
  /** Match only the exact path, for the catch-all "/" entry. */
  readonly exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Patients', to: '/', icon: <IconUsers size={18} />, exact: true },
  { label: 'Register patient', to: '/register', icon: <IconUserPlus size={18} /> },
];

export interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * The application chrome — header, collapsible sidebar and content area —
 * replacing @medplum/react's AppShell so the layout follows our own theme.
 *
 * Only rendered for signed-in users; see src/App.tsx.
 */
export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const location = useLocation();

  return (
    <AppShell
      header={{ height: LAYOUT.headerHeight }}
      navbar={{
        width: LAYOUT.navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="lg"
      styles={{
        main: { background: 'var(--care-surface-app)' },
      }}
    >
      <AppShell.Header
        style={{
          background: 'var(--mantine-color-brand-7)',
          borderBottom: 'none',
        }}
      >
        <Group h="100%" px="md" gap="md" wrap="nowrap" justify="space-between">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color="white"
              aria-label="Toggle navigation"
            />
            <BrandMark onDark />
          </Group>

          <Box style={{ flex: 1, maxWidth: 420 }} visibleFrom="xs">
            <GlobalPatientSearch />
          </Box>

          <UserMenu />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="sm"
        style={{
          background: 'var(--care-surface-card)',
          borderRight: '1px solid var(--care-border)',
        }}
      >
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  component={RouterNavLink}
                  to={item.to}
                  label={item.label}
                  leftSection={item.icon}
                  active={active}
                  variant="filled"
                  onClick={closeMobile}
                  styles={{ root: { borderRadius: 8 } }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
