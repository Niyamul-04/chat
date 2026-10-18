import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common/Avatar';
import { ThemeToggle } from '../common/ThemeToggle';
import { ChatList } from './ChatList';
import { FriendsList } from './FriendsList';
import { RequestsList } from './RequestsList';
import { UserSearch } from './UserSearch';
import { UserProfile } from './UserProfile';
import {
  MessageSquare,
  Users,
  UserPlus,
  Compass,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { activeTab, setActiveTab, receivedRequests } = useChatStore();

  const totalUnreadRequests = receivedRequests.length;

  interface TabItem {
    id: 'chats' | 'search' | 'requests' | 'friends' | 'profile';
    label: string;
    icon: any;
    badge?: number;
  }

  const tabs: TabItem[] = [
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'search', label: 'Explore', icon: Compass },
    { id: 'requests', label: 'Requests', icon: UserPlus, badge: totalUnreadRequests },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-10">
      {/* Top Header */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center space-x-3 cursor-pointer group min-w-0"
        >
          <Avatar
            name={user?.displayName || 'User'}
            src={user?.avatarUrl}
            size="md"
            isOnline={true}
            showOnlineStatus
          />
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {user?.displayName}
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate flex items-center space-x-1">
              <span>@{user?.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            title="Log out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs (Hidden on mobile bottom, shown on desktop) */}
      <div className="hidden md:flex items-center justify-around px-2 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-xs font-semibold relative ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={tab.label}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chats' && <ChatList />}
        {activeTab === 'friends' && <FriendsList />}
        {activeTab === 'requests' && <RequestsList />}
        {activeTab === 'search' && <UserSearch />}
        {activeTab === 'profile' && <UserProfile />}
      </div>

      {/* Mobile Bottom Tab Bar (Android & iOS Ergonomic Bottom Nav) */}
      <nav className="md:hidden flex items-center justify-around py-2 px-2 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 flex flex-col items-center justify-center space-y-1 transition active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
