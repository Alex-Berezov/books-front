'use client';

import type { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isAdminImmersiveRoute } from '@/lib/utils/immersive-routes';
import styles from '@/styles/admin-layouts.module.scss';

interface AdminChromeProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

/**
 * The admin shell - sidebar, top bar, padded main area - around every admin
 * page except the immersive ones (`isAdminImmersiveRoute`), which get the
 * viewport to themselves. The admin counterpart of `LayoutChrome`.
 *
 * Sidebar and top bar come in as rendered elements: the server layout builds
 * them with the session it has already checked.
 */
export const AdminChrome: FC<AdminChromeProps> = (props) => {
  const { sidebar, topBar, children } = props;
  const pathname = usePathname();

  // Without the shell the page still keeps its main landmark.
  if (isAdminImmersiveRoute(pathname)) {
    return <main>{children}</main>;
  }

  return (
    <div className={styles.adminLayout}>
      {sidebar}

      <div className={styles.adminContent}>
        {topBar}

        <main className={styles.adminMain}>{children}</main>
      </div>
    </div>
  );
};
