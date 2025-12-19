/**
 * Capabilities System - Single Source of Truth for User Permissions
 * 
 * Computes what a user can see/do based on roles, verifications, and owned objects.
 * Used throughout the app to avoid inline role checks.
 */

/**
 * Compute user capabilities from roles and permissions data
 * @param {Object} rolesData - Data from /api/roles/my-roles
 * @param {Object} permissionsData - Data from /api/roles/my-permissions
 * @returns {Object} capabilities - Centralized permissions object
 */
export function computeCapabilities(rolesData, permissionsData) {
  const roles = rolesData?.roles || ['buyer'];
  const primaryRole = rolesData?.primary_role || 'buyer';
  const isAdmin = rolesData?.is_admin || false;
  const roleVerifications = rolesData?.role_verifications || {};
  
  // Check if role is verified
  const hasVerifiedRole = (role) => {
    return roleVerifications[role]?.status === 'verified';
  };
  
  // Compute core access
  const capabilities = {
    // User identity
    primary_role: primaryRole,
    roles: roles,
    is_admin: isAdmin,
    
    // Core surface access
    can_access_marketplace: true, // Everyone
    can_access_workspace: roles.includes('broker'), // Workspace is broker-centric
    
    // Publishing capabilities
    can_publish_as_broker: hasVerifiedRole('broker'),
    can_publish_as_owner: permissionsData?.can_publish_as_owner || false,
    verified_properties: permissionsData?.verified_properties || [],
    
    // Admin capabilities
    can_approve_verifications: isAdmin,
    can_access_admin_dashboard: isAdmin,
    
    // Objects they own (will be populated from API calls)
    my_listings: [],
    my_deals: [],
    my_conversations: [],
    saved_deals: [],
    
    // UI Modules to show (key for navigation filtering)
    modules: {
      // Map modes
      map: roles.includes('broker') 
        ? 'prospecting' 
        : roles.includes('seller') 
        ? 'portfolio' 
        : 'discovery',
      
      // Pipeline/deals modes
      pipeline: roles.includes('broker') 
        ? 'operations' 
        : roles.includes('seller') 
        ? 'listings' 
        : 'journey',
      
      // Contacts modes
      contacts: roles.includes('broker') 
        ? 'crm' 
        : 'relationships', // Scoped to active engagements
      
      // Calendar modes
      calendar: true, // Universal
      
      // Broker-only modules
      campaigns: roles.includes('broker') && hasVerifiedRole('broker'),
      team: roles.includes('broker') && hasVerifiedRole('broker'),
      
      // Admin module
      admin: isAdmin
    },
    
    // Dashboard widget configuration
    dashboard_mode: primaryRole, // 'broker', 'seller', 'buyer'
    
    // Feature flags
    features: {
      can_use_ai_insights: hasVerifiedRole('broker'),
      can_send_campaigns: hasVerifiedRole('broker'),
      can_manage_team: hasVerifiedRole('broker'),
      can_view_analytics: roles.includes('broker') || roles.includes('seller'),
      can_submit_offers: roles.includes('buyer'),
      can_request_tours: true
    }
  };
  
  return capabilities;
}

/**
 * Navigation items with capability requirements
 * Used to dynamically filter navigation based on user capabilities
 */
export const NAV_ITEMS = [
  // Universal core (everyone sees these)
  { 
    id: 'dashboard', 
    label: 'Command Center', 
    path: '/workspace/dashboard', 
    icon: 'LayoutDashboard',
    always: true,
    description: 'Your personalized operations hub'
  },
  { 
    id: 'marketplace', 
    label: 'Marketplace', 
    path: '/marketplace', 
    icon: 'Store',
    always: true,
    description: 'Browse and discover deals'
  },
  { 
    id: 'messages', 
    label: 'Messages', 
    path: '/messages', 
    icon: 'MessageCircle',
    always: true,
    description: 'Conversations and inquiries'
  },
  { 
    id: 'calendar', 
    label: 'Calendar', 
    path: '/workspace/calendar', 
    icon: 'Calendar',
    always: true,
    description: 'Events and deadlines'
  },
  
  // Conditional modules (shown based on capabilities)
  { 
    id: 'map', 
    label: 'Map', 
    path: '/workspace/map', 
    icon: 'Map',
    requiresCapability: 'modules.map',
    description: 'Property intelligence and discovery'
  },
  { 
    id: 'pipeline', 
    label: 'Pipeline', 
    path: '/workspace/deals', 
    icon: 'Trello',
    requiresCapability: 'modules.pipeline',
    description: 'Deal flow management'
  },
  { 
    id: 'contacts', 
    label: 'Contacts', 
    path: '/workspace/contacts', 
    icon: 'Users',
    requiresModule: 'contacts',
    description: 'Relationship management'
  },
  { 
    id: 'campaigns', 
    label: 'Campaigns', 
    path: '/workspace/campaigns', 
    icon: 'Mail',
    requiresCapability: 'modules.campaigns',
    description: 'Email outreach and marketing'
  },
  { 
    id: 'team', 
    label: 'Team', 
    path: '/workspace/team', 
    icon: 'UsersRound',
    requiresCapability: 'modules.team',
    description: 'Team collaboration'
  },
  { 
    id: 'admin', 
    label: 'Admin', 
    path: '/workspace/admin/dashboard', 
    icon: 'Shield',
    requiresCapability: 'modules.admin',
    description: 'System administration'
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    path: '/settings', 
    icon: 'Settings',
    always: true,
    description: 'Account and preferences'
  }
];

/**
 * Filter navigation items based on user capabilities
 * @param {Object} capabilities - User capabilities object
 * @returns {Array} Filtered navigation items
 */
export function getVisibleNavItems(capabilities) {
  return NAV_ITEMS.filter(item => {
    // Always show universal items
    if (item.always) return true;
    
    // Check capability requirement
    if (item.requiresCapability) {
      const [module, submodule] = item.requiresCapability.split('.');
      if (submodule) {
        return capabilities[module]?.[submodule];
      }
      return capabilities[item.requiresCapability];
    }
    
    // Check module requirement
    if (item.requiresModule) {
      return capabilities.modules[item.requiresModule];
    }
    
    // Check role requirement
    if (item.requiresRole) {
      return capabilities.roles.includes(item.requiresRole);
    }
    
    return false;
  });
}

/**
 * Helper functions for capability checks in components
 */
export const can = {
  publish: (capabilities, mode = 'broker') => {
    if (mode === 'broker') return capabilities.can_publish_as_broker;
    if (mode === 'owner') return capabilities.can_publish_as_owner;
    return false;
  },
  
  accessAdmin: (capabilities) => capabilities.can_access_admin_dashboard,
  
  useAI: (capabilities) => capabilities.features.can_use_ai_insights,
  
  sendCampaigns: (capabilities) => capabilities.features.can_send_campaigns,
  
  manageTeam: (capabilities) => capabilities.features.can_manage_team,
  
  viewAnalytics: (capabilities) => capabilities.features.can_view_analytics,
  
  submitOffers: (capabilities) => capabilities.features.can_submit_offers
};
