import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { MessageSquare, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4 animate-pulse">
          <MessageSquare className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Starting ChatSphere...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <ChatPage /> : <AuthPage />;
};

export default App;
