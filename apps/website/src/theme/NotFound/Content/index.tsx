import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

export default function NotFoundContent(): ReactNode {
  return (
    <main className="container margin-vert--xl">
      <Heading as="h1">Page not found</Heading>
      <p>
        This page doesn't exist, or it moved. Try the search box in the navbar, or one of these:
      </p>
      <ul className="deih-links">
        <li>
          <Link to="/docs/start-here">Start here</Link>: how to use the handbook
        </li>
        <li>
          <Link to="/questions">Question bank</Link>: all practice questions
        </li>
        <li>
          <Link to="/playground">SQL playground</Link>
        </li>
        <li>
          <Link to="/planner">DE 75 planner</Link>
        </li>
      </ul>
    </main>
  );
}
