// --- Supabase Config ---
const SUPABASE_URL = 'https://hfugnpqguidgosxyuioj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdWducHFndWlkZ29zeHl1aW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjE3ODAsImV4cCI6MjA3ODAzNzc4MH0.eawP-KaZTXOAE_OSYeJR6Ds_c6aKsqOsXo_EGifgtrU'; // Use your real anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const COMMUNITY_GOAL = 1000000;

// --- Global State ---
let currentUser = null;

// --- DOM Elements ---
const profileIcon = document.getElementById('profileIcon');
const profileInitial = document.getElementById('profileInitial');
const profileDropdown = document.getElementById('profileDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');
const userMinutes = document.getElementById('userMinutes');
const leaderboardContainer = document.getElementById('leaderboardContainer');
const communityProgressText = document.getElementById('communityProgressText');
const communityProgressBar = document.getElementById('communityProgressBar');
const logMinutesBtn = document.getElementById('logMinutesBtn');
const minutesInput = document.getElementById('minutesInput');
const logMessage = document.getElementById('logMessage');


/**
 * Main function to load all dashboard data
 */
async function loadDashboard() {
  // Check for user session (using your current method)
  const username = sessionStorage.getItem('username');
  if (!username) {
    window.location.href = 'login.html';
    return;
  }

  try {
    // 1. Fetch current user data
    const { data: userData, error: userError } = await supabase
      .from('Userdetails')
      .select('*')
      .eq('user_name', username)
      .single();

    if (userError) throw userError;
    
    currentUser = userData;

    // 2. Update UI elements
    profileInitial.textContent = currentUser.user_name[0].toUpperCase();
    welcomeMessage.textContent = `Welcome back, ${currentUser.user_name}!`;
    userMinutes.textContent = `${currentUser.minutes_logged.toLocaleString()} minutes`;

    // 3. Load Leaderboard (don't need to await this)
    loadLeaderboard();
    
    // 4. Load Community Progress (don't need to await this)
    loadCommunityProgress();

  } catch (err) {
    alert('Error loading user data: ' + err.message);
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
  }
}

/**
 * Fetches and renders the top 10 leaderboard
 */
async function loadLeaderboard() {
  const { data: leaderboardData, error } = await supabase
    .from('Userdetails')
    .select('user_name, minutes_logged')
    .order('minutes_logged', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error loading leaderboard:', error);
    return;
  }

  leaderboardContainer.innerHTML = ''; // Clear existing
  
  // Find the max minutes for scaling the bars (makes it relative)
  const maxMinutes = leaderboardData[0]?.minutes_logged || 1;

  leaderboardData.forEach(user => {
    const barWidth = Math.max(1, (user.minutes_logged / maxMinutes) * 100); // % width

    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry';
    entry.innerHTML = `
      <div class="leaderboard-profile">${user.user_name[0].toUpperCase()}</div>
      <div class="leaderboard-bar-container">
        <div class="leaderboard-bar" style="width: ${barWidth}%;">${user.user_name}</div>
      </div>
      <div class="leaderboard-label">${user.minutes_logged.toLocaleString()}</div>
    `;
    leaderboardContainer.appendChild(entry);
  });
}

/**
 * Fetches and renders community progress
 */
async function loadCommunityProgress() {
  const { data: allData, error } = await supabase
    .from('Userdetails')
    .select('minutes_logged');

  if (error) {
    console.error('Error loading community data:', error);
    return;
  }

  const totalMinutes = allData.reduce((sum, u) => sum + u.minutes_logged, 0);
  const percentage = ((totalMinutes / COMMUNITY_GOAL) * 100).toFixed(2);

  communityProgressText.textContent = 
    `Community has logged ${totalMinutes.toLocaleString()} of ${COMMUNITY_GOAL.toLocaleString()} minutes (${percentage}%)`;
  
  communityProgressBar.value = totalMinutes;
  communityProgressBar.max = COMMUNITY_GOAL;
}

/**
 * Handles logging new minutes
 */
async function handleLogMinutes() {
  const minutes = parseInt(minutesInput.value);
  logMessage.textContent = ''; // Clear old messages

  if (isNaN(minutes) || minutes < 1 || minutes > 120) {
    logMessage.textContent = 'Please enter a valid number of minutes (1-120).';
    return;
  }

  if (!currentUser) {
    logMessage.textContent = 'User data not loaded. Please refresh.';
    return;
  }

  // --- THIS IS THE BUG FIX ---
  // We need to get the 'data' and 'error' from the response
  const newTotalMinutes = currentUser.minutes_logged + minutes;

  const { data: updatedUser, error } = await supabase
    .from('Userdetails')
    .update({ minutes_logged: newTotalMinutes })
    .eq('user_name', currentUser.user_name)
    .select() // Make sure to .select() to get the updated row back
    .single(); // Use .single() as we're updating one user

  if (error) {
    logMessage.textContent = 'Error logging minutes: ' + error.message;
    return;
  }

  // --- END BUG FIX ---

  // Update local state
  currentUser = updatedUser;

  // Reset input
  minutesInput.value = '';
  
  // Reload dashboard sections with new data
  // (We could update them manually, but reloading is simpler for now)
  userMinutes.textContent = `${currentUser.minutes_logged.toLocaleString()} minutes`;
  loadLeaderboard();
  loadCommunityProgress();

  logMessage.textContent = `Successfully logged ${minutes} minutes!`;
  logMessage.style.color = '#28a745'; // Green for success
  setTimeout(() => logMessage.textContent = '', 3000); // Clear message
}

/**
 * Handles user logout
 */
function handleLogout() {
  sessionStorage.removeItem('username');
  window.location.href = 'login.html';
}

// --- Event Listeners ---

// Profile dropdown toggle
profileIcon.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevents click from closing it immediately
  profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown if clicking outside
document.addEventListener('click', () => {
  profileDropdown.style.display = 'none';
});

// Logout button
logoutBtn.addEventListener('click', handleLogout);

// Log minutes button
logMinutesBtn.addEventListener('click', handleLogMinutes);

// Run on page load
document.addEventListener('DOMContentLoaded', loadDashboard);
