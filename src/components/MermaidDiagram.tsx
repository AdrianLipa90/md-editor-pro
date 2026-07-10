//src/components/MermaidDiagram.tsx

import React, { useEffect, useId, useRef, useState } from 'react';

type MermaidApi = typeof import('mermaid').default;

interface MermaidDiagramProps {
  chart: string;
  isDark: boolean;
}

// Mermaid is ~1.5 MB, so it is loaded on demand the first time a diagram renders
let mermaidPromise: Promise<MermaidApi> | null = null;
const getMermaid = (): Promise<MermaidApi> => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
};

let initializedForDark: boolean | null = null;

const initializeMermaid = (mermaid: MermaidApi, isDark: boolean) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    themeVariables: {
      primaryColor: isDark ? '#58a6ff' : '#0969da',
      primaryTextColor: isDark ? '#e6edf3' : '#24292f',
      primaryBorderColor: isDark ? '#30363d' : '#d1d9e0',
      lineColor: isDark ? '#484f58' : '#656d76',
      secondaryColor: isDark ? '#21262d' : '#f6f8fa',
      tertiaryColor: isDark ? '#161b22' : '#ffffff',
      background: isDark ? '#0d1117' : '#ffffff',
      mainBkg: isDark ? '#21262d' : '#f6f8fa',
      secondBkg: isDark ? '#30363d' : '#ffffff',
      tertiaryBkg: isDark ? '#161b22' : '#f6f8fa'
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
    fontSize: 14,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true
    },
    sequence: {
      useMaxWidth: true,
      wrap: true
    },
    gantt: {
      useMaxWidth: true
    }
  });
  initializedForDark = isDark;
};

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isDark }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ref.current) return;

    // mermaid.render requires an id valid as a CSS selector
    const renderId = 'mermaid-' + reactId.replace(/[^a-zA-Z0-9]/g, '');

    getMermaid()
      .then((mermaid) => {
        if (cancelled) return null;
        if (initializedForDark !== isDark) {
          initializeMermaid(mermaid, isDark);
        }
        return mermaid.render(renderId, chart);
      })
      .then((result) => {
        if (result && !cancelled && ref.current) {
          ref.current.innerHTML = result.svg;
          setHasError(false);
        }
      })
      .catch(() => {
        // Keep the last successful diagram visible while the user is
        // mid-edit; only flag the error state.
        if (!cancelled) {
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, isDark, reactId]);

  return (
    <div className="my-4">
      <div
        ref={ref}
        className="flex justify-center overflow-x-auto"
        style={{ minHeight: '60px' }}
      />
      {hasError && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400 mt-1">
          Diagram has a syntax error — showing last valid version
        </p>
      )}
    </div>
  );
};

export default React.memo(MermaidDiagram);
