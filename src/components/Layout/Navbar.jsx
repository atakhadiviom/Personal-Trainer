import React from 'react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'plan', icon: '📋', label: 'My Plan' },
    { id: 'calories', icon: '🔥', label: 'Nutrition' },
    { id: 'health', icon: '❤️', label: 'Health' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
