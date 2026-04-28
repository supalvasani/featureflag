import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
