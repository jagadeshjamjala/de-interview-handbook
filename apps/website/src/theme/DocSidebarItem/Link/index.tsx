import type {ComponentProps, ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@theme-original/DocSidebarItem/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {levelStore} from '@site/src/lib/store';

type Props = ComponentProps<typeof Link>;

// Dim (not hide) sidebar pages that aren't tagged for the selected level.
export default function DocSidebarItemLink(props: Props): ReactNode {
  const level = levelStore.use();
  const levels = usePluginData('doc-levels') as Record<string, string[]>;
  const docId = (props.item as {docId?: string}).docId;
  const dim = Boolean(level && docId && levels[docId] && !levels[docId].includes(level));
  return (
    <Link
      {...props}
      item={{...props.item, className: clsx(props.item.className, dim && 'sidebar-dim')}}
    />
  );
}
