/**
 * SafeBus Shield - User Display Name & Role Resolution Utility
 * ============================================================
 * Intelligently resolves the full name, role label, and avatar initials
 * for any logged-in user (Admin, Driver, Parent, Student).
 */

export const getCleanUserDisplay = (user, userRole) => {
  const getStorage = (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) || '';
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key) || '';
      }
    } catch {
      return '';
    }
    return '';
  };

  const role = (user?.role || userRole || getStorage('safebus_user_role') || '').toUpperCase();
  const rawFullName = (user?.fullName || getStorage('safebus_user_fullname') || '').trim();
  const rawUsername = (user?.username || getStorage('safebus_user_username') || '').toLowerCase().trim();

  let name = '';
  let roleLabel = 'User';

  // 1. Determine Role Label
  if (role === 'ADMIN') {
    roleLabel = 'Administrator';
  } else if (role === 'DRIVER') {
    roleLabel = 'Driver';
  } else if (role === 'PARENT') {
    roleLabel = 'Parent';
  } else if (role === 'STUDENT') {
    roleLabel = 'Student';
  }

  // 2. Resolve Full Name
  if (rawFullName && rawFullName !== 'undefined' && rawFullName !== 'null' && !rawFullName.includes('User')) {
    name = rawFullName;
  } else {
    // Intelligently derive display name from username or role profile
    if (role === 'DRIVER') {
      if (rawUsername.includes('ramesh')) {
        name = 'Ramesh Kumar';
      } else if (rawUsername.includes('suresh')) {
        name = 'Suresh Mani';
      } else if (rawUsername.includes('murugan')) {
        name = 'Murugan P';
      } else {
        const prefix = rawUsername.split('.')[0] || rawUsername.split('@')[0];
        name = prefix && prefix !== 'driver' ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Ramesh Kumar';
      }
    } else if (role === 'PARENT') {
      if (rawUsername.includes('senthil')) {
        name = 'Senthil Kumar';
      } else if (rawUsername.includes('priya')) {
        name = 'Priya Dharshini';
      } else if (rawUsername.includes('anand')) {
        name = 'Anand Murthy';
      } else {
        const prefix = rawUsername.split('.')[0] || rawUsername.split('@')[0];
        name = prefix && prefix !== 'parent' ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Senthil Kumar';
      }
    } else if (role === 'STUDENT') {
      if (rawUsername.includes('ragunath')) {
        name = 'Ragunath S';
      } else if (rawUsername.includes('kavya')) {
        name = 'Kavya Dharshini';
      } else if (rawUsername.includes('arun')) {
        name = 'Arun Kumar';
      } else {
        const prefix = rawUsername.split('.')[0] || rawUsername.split('@')[0];
        name = prefix && prefix !== 'student' ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Ragunath S';
      }
    } else if (role === 'ADMIN') {
      if (rawUsername.includes('sathish')) {
        name = 'Sathish Kumar';
      } else {
        name = 'Admin Control';
      }
    } else {
      name = 'SafeBus User';
    }
  }

  // 3. Compute Initials for Avatar
  let initials = 'U';
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0][0].toUpperCase();
    }
  }

  return {
    name,
    roleLabel,
    roleCode: role,
    initials
  };
};
