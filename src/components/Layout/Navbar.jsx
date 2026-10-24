import React from 'react';

const svg = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const icons = {
  plan: svg(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  calories: svg(<><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1 1 2 2 2 0-3-1-5 1-8z" /></>),
  health: svg(<path d="M3 12h4l2-6 4 12 2-6h6" />),
  profile: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
};

const Navbar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'plan', label: 'My Plan' },
    { id: 'calories', label: 'Nutrition' },
    { id: 'health', label: 'Health' },
    { id: 'profile', label: 'Profile' }
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="nav-icon">{icons[tab.id]}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
