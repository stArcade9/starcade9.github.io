import { notFound } from 'next/navigation';
import { findExperienceByToken } from '@/lib/experience';
import { ExperienceShell } from './experience-shell';

// Pinned to the same version the existing console.html/cart-runner.html
// viewers in this repo use, so the engine's `import * as THREE from 'three'`
// (a bare specifier — these are plain static files, not bundled by Next.js)
// resolves consistently everywhere Nova64 runs in this project.
const THREE_VERSION = '0.182.0';

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const experience = await findExperienceByToken(token);

  if (!experience || experience.status === 'disabled') {
    notFound();
  }

  const importMap = {
    imports: {
      three: `https://esm.sh/three@${THREE_VERSION}`,
      'three/tsl': `https://esm.sh/three@${THREE_VERSION}/tsl`,
      'three/webgpu': `https://esm.sh/three@${THREE_VERSION}/webgpu`,
      'three/examples/jsm/': `https://esm.sh/three@${THREE_VERSION}/examples/jsm/`,
    },
  };

  return (
    <>
      {/* Must appear before the engine's dynamic import() of boot.js so the
          browser can resolve its bare "three" import — see boot.js's header comment. */}
      <script type="importmap" dangerouslySetInnerHTML={{ __html: JSON.stringify(importMap) }} />
      <ExperienceShell token={token} />
    </>
  );
}
