import { useEffect } from 'react';
import { useStore } from './store';
import Landing from './components/Landing';
import TourView from './components/TourView';
import ChatPanel from './components/ChatPanel';

function App() {
  const mode = useStore((s) => s.mode);
  const initDarkMode = useStore((s) => s.initDarkMode);

  // Apply dark mode class on initial load
  useEffect(() => {
    initDarkMode();
  }, [initDarkMode]);

  return (
    <div className="min-h-dvh">
      {mode === 'landing' && <Landing />}
      {mode === 'tour' && <TourView />}
      <ChatPanel />
    </div>
  );
}

export default App;
