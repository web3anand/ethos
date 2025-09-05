import React, { useState, useEffect } from 'react';
import { fetchUserActivities, getActivityTypeDisplayName, getActivityTypeColor, formatActivityDate, getActivityLink } from '../utils/fetchUserActivities';
import { getUserStats } from '../utils/ethosApiClient';
import styles from './UserActivities.module.css';

// Score levels for mapping score to name and color (same as EthosProfileCard)
const scoreLevels = [
  { min: 0, max: 799, name: 'Untrusted', color: '#e74c3c' },
  { min: 800, max: 1199, name: 'Questionable', color: '#e1b000' },
  { min: 1200, max: 1399, name: 'Neutral', color: '#e2e2e2', text: '#222' },
  { min: 1400, max: 1599, name: 'Known', color: '#8cb6e6' },
  { min: 1600, max: 1799, name: 'Established', color: '#5fa8d3' },
  { min: 1800, max: 1999, name: 'Reputable', color: '#3b82f6' },
  { min: 2000, max: 2199, name: 'Exemplary', color: '#34d399' },
  { min: 2200, max: 2399, name: 'Distinguished', color: '#22c55e' },
  { min: 2400, max: 2599, name: 'Revered', color: '#a78bfa' },
  { min: 2600, max: 2800, name: 'Renowned', color: '#a855f7' },
];

// Score name and color mapping
function getScoreLevel(score) {
  return scoreLevels.find(l => score >= l.min && score <= l.max) || scoreLevels[0];
}

// Custom Dropdown Component
const CustomDropdown = ({ value, onChange, options, className, placeholder, onOpenChange, id, closeOtherDropdowns }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(option => option.value === value);
  
  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    onOpenChange && onOpenChange(false, id);
  };
  
  const handleToggle = () => {
    const newIsOpen = !isOpen;
    
    // Close other dropdowns if this one is opening
    if (newIsOpen && closeOtherDropdowns) {
      closeOtherDropdowns(id);
    }
    
    setIsOpen(newIsOpen);
    onOpenChange && onOpenChange(newIsOpen, id);
  };
  
  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      onOpenChange && onOpenChange(false, id);
    }, 150);
  };

  // External close function using a global registry
  React.useEffect(() => {
    // Register this dropdown's close function
    window[`closeDropdown_${id}`] = () => {
      setIsOpen(false);
      onOpenChange && onOpenChange(false, id);
    };
    
    // Cleanup on unmount
    return () => {
      delete window[`closeDropdown_${id}`];
    };
  }, [id, onOpenChange]);
  
  return (
    <div className={`${styles.customDropdown} ${className}`}>
      <div 
        className={styles.dropdownTrigger}
        onClick={handleToggle}
        onBlur={handleBlur}
        tabIndex={0}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ''}`}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options.map(option => (
            <div
              key={option.value}
              className={`${styles.dropdownOption} ${value === option.value ? styles.dropdownOptionSelected : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function UserActivities({ profile, activities: initialActivities }) {
  const [activities, setActivities] = useState(initialActivities || []);
  const [isOpen, setIsOpen] = useState(true); // Default to open in dashboard view
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDirection, setSelectedDirection] = useState('all');
  const [isAnyDropdownOpen, setIsAnyDropdownOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [userScores, setUserScores] = useState({}); // Cache for user scores

  // Debug: Log userScores changes
  useEffect(() => {
    console.log('[UserActivities] UserScores updated:', userScores);
  }, [userScores]);

  // Function to close other dropdowns
  const closeOtherDropdowns = (currentDropdownId) => {
    const dropdownIds = ['type-filter', 'direction-filter'];
    dropdownIds.forEach(id => {
      if (id !== currentDropdownId && window[`closeDropdown_${id}`]) {
        window[`closeDropdown_${id}`]();
      }
    });
  };

  // Function to fetch user score by profile ID
  const fetchUserScore = async (profileId) => {
    console.log('[UserActivities] fetchUserScore called with profileId:', profileId, 'type:', typeof profileId);
    
    if (!profileId) {
      console.log('[UserActivities] No profileId provided, returning 0');
      return 0;
    }
    
    if (userScores[profileId] !== undefined) {
      console.log('[UserActivities] Score already cached for', profileId, ':', userScores[profileId]);
      return userScores[profileId];
    }

    try {
      console.log('[UserActivities] Fetching score for profileId:', profileId);
      console.log('[UserActivities] Calling getUserStats with:', `profileId:${profileId}`);
      
      const userStats = await getUserStats(`profileId:${profileId}`);
      console.log('[UserActivities] Raw API response for', profileId, ':', userStats);
      
      const score = userStats?.score || userStats?.influenceScore || 0;
      console.log('[UserActivities] Extracted score for', profileId, ':', score);
      
      // Cache the score
      setUserScores(prev => {
        const newScores = {
          ...prev,
          [profileId]: score
        };
        console.log('[UserActivities] Updated userScores cache:', newScores);
        return newScores;
      });
      
      return score;
    } catch (error) {
      console.error('[UserActivities] Error fetching user score for profileId:', profileId, error);
      
      // Cache the error result as 0
      setUserScores(prev => ({
        ...prev,
        [profileId]: 0
      }));
      
      return 0;
    }
  };

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'review', label: 'Reviews' },
    { value: 'vouch', label: 'Vouches' },
    { value: 'unvouch', label: 'Unvouches' },
    { value: 'vote', label: 'Votes' },
    { value: 'attestation', label: 'Attestations' },
    { value: 'slash', label: 'Slashes' },
    { value: 'market', label: 'Markets' },
    { value: 'project', label: 'Projects' }
  ];

  const directionTypes = [
    { value: 'all', label: 'All (Given & Received)' },
    { value: 'given', label: 'Given by User' },
    { value: 'received', label: 'Received by User' }
  ];

  const handleDropdownOpenChange = (isDropdownOpen, dropdownId) => {
    setIsAnyDropdownOpen(isDropdownOpen);
    
    if (isDropdownOpen) {
      setOpenDropdownId(dropdownId);
    } else {
      setOpenDropdownId(null);
    }
  };

  useEffect(() => {
    if (profile?.profileId) {
      loadActivities();
    }
  }, [profile?.profileId, selectedType, selectedDirection]);

  const loadActivities = async () => {
    if (!profile?.profileId) return;
    
    setIsLoading(true);
    try {
      const activityType = selectedType === 'all' ? null : selectedType;
      console.log('[UserActivities] Loading activities for profileId:', profile.profileId, 'type:', activityType, 'direction:', selectedDirection);
      const fetchedActivities = await fetchUserActivities(profile.profileId, activityType, 100); // Increased limit for filtering
      console.log('[UserActivities] Fetched activities:', fetchedActivities);
      
      // Filter activities based on direction
      let filteredActivities = fetchedActivities;
      if (selectedDirection !== 'all') {
        filteredActivities = fetchedActivities.filter(activity => {
          const isUserAuthor = isActivityByUser(activity, profile);
          return selectedDirection === 'given' ? isUserAuthor : !isUserAuthor;
        });
      }
      
      console.log('[UserActivities] Filtered activities:', filteredActivities);
      setActivities(filteredActivities);
      
      // Fetch scores for all participants in the activities
      const participantIds = new Set();
      filteredActivities.forEach(activity => {
        const author = getActivityAuthor(activity);
        const target = getActivityTarget(activity);
        
        console.log('[UserActivities] Activity author:', author);
        console.log('[UserActivities] Activity target:', target);
        
        if (author?.profileId || author?.id) {
          participantIds.add(author.profileId || author.id);
        }
        if (target?.profileId || target?.id) {
          participantIds.add(target.profileId || target.id);
        }
      });
      
      console.log('[UserActivities] Participant IDs to fetch scores for:', Array.from(participantIds));
      
      // Fetch scores for all unique participants
      for (const profileId of participantIds) {
        if (profileId && !userScores[profileId]) {
          console.log('[UserActivities] Calling fetchUserScore for profileId:', profileId);
          fetchUserScore(profileId);
        } else {
          console.log('[UserActivities] Skipping fetchUserScore for profileId:', profileId, 'already cached:', userScores[profileId]);
        }
      }
    } catch (error) {
      console.error('[UserActivities] Error loading activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine if activity was made by the user
  const isActivityByUser = (activity, userProfile) => {
    if (!activity || !userProfile) return false;
    
    // Check various author fields
    const authorId = activity.author?.profileId || 
                    activity.author?.id || 
                    activity.authorId || 
                    activity.authorProfileId ||
                    activity.data?.author?.profileId ||
                    activity.data?.author?.id;
    
    const subjectId = activity.subject?.profileId || 
                     activity.subject?.id || 
                     activity.subjectId || 
                     activity.subjectProfileId ||
                     activity.data?.subject?.profileId ||
                     activity.data?.subject?.id;
    
    // Activity is "by user" if user is the author
    return authorId && (String(authorId) === String(userProfile.profileId) || String(authorId) === String(userProfile.id));
  };

  // Helper function to get the person who made the activity
  const getActivityAuthor = (activity) => {
    const author = activity.author || activity.data?.author;
    if (author) {
      return {
        name: author.displayName || author.name || author.username || 'Unknown User',
        profileId: author.profileId || author.id,
        avatarUrl: author.avatarUrl || author.avatar
      };
    }
    
    // Fallback to extract from other fields
    if (activity.authorId || activity.authorProfileId) {
      return {
        name: 'User',
        profileId: activity.authorId || activity.authorProfileId
      };
    }
    
    return null;
  };

  // Helper function to get the target of the activity
  const getActivityTarget = (activity) => {
    const target = activity.subject || activity.target || activity.data?.subject || activity.data?.target;
    if (target) {
      return {
        name: target.displayName || target.name || target.username || target.address || 'Unknown User',
        profileId: target.profileId || target.id,
        avatarUrl: target.avatarUrl || target.avatar
      };
    }
    
    return null;
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const renderActivityItem = (activity, index) => {
    const typeColor = getActivityTypeColor(activity.type);
    const displayName = getActivityTypeDisplayName(activity.type);
    
    // Better date parsing
    const activityDate = activity.createdAt || activity.timestamp || activity.date;
    const date = formatActivityDate(activityDate);
    
    // Get transaction link
    const activityLink = getActivityLink(activity);

    // Determine if this activity was made by the user or received by them
    const isUserAuthor = isActivityByUser(activity, profile);
    const author = getActivityAuthor(activity);
    const target = getActivityTarget(activity);

    // Extract meaningful data from the activity
    const activityData = activity.data || {};
    const amount = activityData.amount || activityData.ethAmount;
    const score = activityData.score || activityData.rating;
    const description = activityData.description || activityData.comment || activityData.content;

    // Get profile picture URLs
    const authorAvatar = author?.avatar || author?.avatarUrl || author?.profilePicture;
    const targetAvatar = target?.avatar || target?.avatarUrl || target?.profilePicture;
    
    // Get real Ethos scores for participants
    const authorProfileId = author?.profileId || author?.id;
    const targetProfileId = target?.profileId || target?.id;
    
    // Get cached scores or use fallback (0 = Untrusted/Red ring as default)
    const authorScore = userScores[authorProfileId] ?? 0;
    const targetScore = userScores[targetProfileId] ?? 0;
    
    console.log('[UserActivities] Rendering activity:', activity.type);
    console.log('[UserActivities] Author ID:', authorProfileId, 'Score:', authorScore, 'Color:', getScoreLevel(authorScore).color);
    console.log('[UserActivities] Target ID:', targetProfileId, 'Score:', targetScore, 'Color:', getScoreLevel(targetScore).color);
    
    // Get vouch amount and transaction hash for enhanced display
    const vouchAmount = activity.amount || activityData.amount || activityData.ethAmount;
    const transactionHash = activity.hash || activity.transactionHash || activityData.hash || activityData.transactionHash;
    const blockchainExplorerLink = transactionHash ? `https://etherscan.io/tx/${transactionHash}` : null;

    return (
      <div key={`${activity.id || index}-${activity.type}`} className={`${styles.activityItem} ${isUserAuthor ? styles.activityByUser : styles.activityToUser}`}>
        <div className={styles.activityHeader}>
          <div className={styles.activityTypeSection}>
            <span 
              className={styles.activityType}
              style={{ backgroundColor: typeColor }}
            >
              {displayName}
            </span>
            <span className={styles.activityDirection}>
              {isUserAuthor ? '→ Given' : '← Received'}
            </span>
            {vouchAmount && (
              <span className={styles.vouchAmount}>
                💰 {vouchAmount} {activityData.currency || 'ETH'}
              </span>
            )}
          </div>
          <div className={styles.activityMeta}>
            <span className={styles.activityDate}>{date}</span>
            <div className={styles.activityLinks}>
              {activityLink && (
                <a 
                  href={activityLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.activityLink}
                  title="View on Ethos"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ethos
                </a>
              )}
              {blockchainExplorerLink && (
                <a 
                  href={blockchainExplorerLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.transactionLink}
                  title="View transaction on Etherscan"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  TX
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.activityContent}>
          {/* Show who made the activity with profile pictures */}
          <div className={styles.activityParticipants}>
            {author && (
              <div className={styles.activityAuthor}>
                <div className={styles.participantInfo}>
                  <div 
                    className={styles.participantAvatar}
                    style={{ '--pfp-ring': getScoreLevel(authorScore).color }}
                    title={`Author Score: ${authorScore} (${getScoreLevel(authorScore).name})`}
                  >
                    {authorAvatar ? (
                      <img 
                        src={authorAvatar} 
                        alt={author.name || 'User'} 
                        className={styles.avatarImage}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={styles.avatarFallback} style={{ display: authorAvatar ? 'none' : 'flex' }}>
                      {(author.name || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.participantDetails}>
                    <span className={styles.participantLabel}>
                      {isUserAuthor ? 'You' : 'From'}:
                    </span>
                    <span className={styles.participantName}>
                      {isUserAuthor ? profile.displayName || 'You' : author.name}
                      {author.profileId && !isUserAuthor && (
                        <span className={styles.participantId}> (#{author.profileId})</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {target && (
              <div className={styles.activityTarget}>
                <div className={styles.participantInfo}>
                  <div 
                    className={styles.participantAvatar}
                    style={{ '--pfp-ring': getScoreLevel(targetScore).color }}
                  >
                    {targetAvatar ? (
                      <img 
                        src={targetAvatar} 
                        alt={target.name || 'User'} 
                        className={styles.avatarImage}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={styles.avatarFallback} style={{ display: targetAvatar ? 'none' : 'flex' }}>
                      {isUserAuthor ? (target.name || 'U')[0].toUpperCase() : (profile.displayName || 'Y')[0].toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.participantDetails}>
                    <span className={styles.participantLabel}>
                      {isUserAuthor ? 'To' : 'About you'}:
                    </span>
                    <span className={styles.participantName}>
                      {isUserAuthor ? target.name : (profile.displayName || 'You')}
                      {target.profileId && isUserAuthor && (
                        <span className={styles.participantId}> (#{target.profileId})</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {description && (
            <div className={styles.activityDescription}>
              <span className={styles.descriptionLabel}>Description:</span>
              <p className={styles.descriptionText}>
                {typeof description === 'string' ? description : JSON.stringify(description)}
              </p>
            </div>
          )}
          
          {amount && (
            <div className={styles.activityAmount}>
              <span className={styles.activityAmountLabel}>Amount:</span>
              <span className={styles.activityAmountValue}>
                {amount} {activityData.currency || 'ETH'}
              </span>
            </div>
          )}
          
          {score && (
            <div className={styles.activityScore}>
              <span className={styles.activityScoreLabel}>Score:</span>
              <span className={styles.activityScoreValue}>{score}</span>
            </div>
          )}

          {/* Show timestamp for debugging */}
          <div className={styles.activityDebug}>
            <small style={{ color: '#888', fontSize: '0.75rem' }}>
              Type: {activity.type} | ID: {activity.id || 'N/A'} | Author: {isUserAuthor ? 'User' : 'Other'}
            </small>
          </div>
        </div>
      </div>
    );
  };

  // In dashboard view, we don't want the toggle button
  if (initialActivities) {
    return (
      <div className={styles.activitiesSection}>
        <div className={styles.activitiesContent}>
          <div className={styles.activitiesControls}>
            <CustomDropdown
              value={selectedType}
              onChange={setSelectedType}
              options={activityTypes}
              className={styles.typeFilter}
              placeholder="Select Activity Type"
              onOpenChange={handleDropdownOpenChange}
              id="type-filter"
              closeOtherDropdowns={closeOtherDropdowns}
            />

            <CustomDropdown
              value={selectedDirection}
              onChange={setSelectedDirection}
              options={directionTypes}
              className={styles.directionFilter}
              placeholder="Select Direction"
              onOpenChange={handleDropdownOpenChange}
              id="direction-filter"
              closeOtherDropdowns={closeOtherDropdowns}
            />
            
            <button 
              onClick={loadActivities} 
              className={styles.refreshButton}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className={styles.activitiesList}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <span>Loading activities...</span>
              </div>
            ) : activities.length > 0 ? (
              activities.map((activity, index) => renderActivityItem(activity, index))
            ) : (
              <div className={styles.emptyState}>
                <p>No {selectedType === 'all' ? '' : selectedType} activities found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.activitiesSection}>
      <button 
        className={styles.activitiesToggle}
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <span>Activities</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 1.5L7 7L12.5 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className={`${styles.activitiesContent} ${isAnyDropdownOpen ? styles.dropdownOpen : ''}`}>
          <div className={`${styles.activitiesControls} ${isAnyDropdownOpen ? styles.dropdownOpen : ''}`}>
            <CustomDropdown
              value={selectedType}
              onChange={setSelectedType}
              options={activityTypes}
              className={styles.typeFilter}
              placeholder="Select Activity Type"
              onOpenChange={handleDropdownOpenChange}
              id="type-filter"
              closeOtherDropdowns={closeOtherDropdowns}
            />

            <CustomDropdown
              value={selectedDirection}
              onChange={setSelectedDirection}
              options={directionTypes}
              className={styles.directionFilter}
              placeholder="Select Direction"
              onOpenChange={handleDropdownOpenChange}
              id="direction-filter"
              closeOtherDropdowns={closeOtherDropdowns}
            />
            
            <button 
              onClick={loadActivities} 
              className={styles.refreshButton}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className={styles.activitiesList}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <span>Loading activities...</span>
              </div>
            ) : activities.length > 0 ? (
              activities.map((activity, index) => renderActivityItem(activity, index))
            ) : (
              <div className={styles.emptyState}>
                <p>No {selectedType === 'all' ? '' : selectedType} activities found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}