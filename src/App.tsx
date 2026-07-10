//src/App.tsx

import MarkdownEditor from './components/MarkdownEditor';

function App() {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-[#0d1117] dark:to-[#161b22] p-4">
      <MarkdownEditor />
    </div>
  );
}

export default App;
