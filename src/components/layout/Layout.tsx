import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FileText, Columns3, Search, Bell, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { useAppStore } from '@/store/appStore';

interface NavTab {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
}

const navTabs: NavTab[] = [
  { to: '/meetings', end: true, icon: <FileText className="w-4 h-4" />, label: '总览' },
  { to: '/board', icon: <Columns3 className="w-4 h-4" />, label: '看板' },
  { to: '/search', icon: <Search className="w-4 h-4" />, label: '搜索' },
];

const Layout: React.FC = () => {
  const { currentUser, unreadCount, fetchNotifications, markAllRead } = useAppStore();
  const [showNotifications, setShowNotifications] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBellClick = async () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications && unreadCount > 0) {
      await markAllRead();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="nav-gradient text-white sticky top-0 z-50 shadow-lg">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide">会议纪要</h1>
                <p className="text-xs text-white/60 -mt-0.5">行动项追踪系统</p>
              </div>
            </div>

            <nav className="flex items-center gap-1 h-full">
              {navTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      'relative h-full flex items-center gap-1.5 px-4 text-sm font-medium',
                      'transition-colors duration-200',
                      isActive
                        ? 'text-white'
                        : 'text-white/70 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.icon}
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          'absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-400 transition-all duration-200',
                          isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                className="!bg-white !bg-opacity-15 hover:!bg-opacity-25 !text-white !border !border-white/20 !shadow-none"
                onClick={() => {
                  window.location.href = '/meetings/new';
                }}
              >
                新建会议
              </Button>

              <div className="relative">
                <button
                  onClick={handleBellClick}
                  className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <Badge count={unreadCount} />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 text-slate-800 overflow-hidden animate-fade-in-up z-50">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-sm">通知</span>
                      <button
                        onClick={markAllRead}
                        className="text-xs text-navy-600 hover:text-navy-700"
                      >
                        全部已读
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {useAppStore.getState().notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                          暂无通知
                        </div>
                      ) : (
                        useAppStore.getState().notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50',
                              n.read === 0 && 'bg-amber-50/50'
                            )}
                          >
                            <div className="text-sm font-medium text-slate-800">{n.title}</div>
                            {n.content && (
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <Avatar
                  name={currentUser.name}
                  size="md"
                  color={currentUser.avatarColor}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
