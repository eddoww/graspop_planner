import React, { useState, useEffect } from "react";
import { Star, Music, ChevronDown, ChevronUp, AlertTriangle, Download, Share, Calendar, List, Clock, MapPin } from "lucide-react";
import _ from "lodash";
import UserSelection from "./UserSelection";
import { useUser } from "../contexts/UserContext";

// Stage color mapping remains the same
const stageColors = {
  Marquee: "bg-purple-100 text-purple-800",
  "Metal Dome": "bg-blue-100 text-blue-800",
  "North Stage": "bg-red-100 text-red-800",
  "South Stage": "bg-green-100 text-green-800",
  "Jupiler Stage": "bg-yellow-100 text-yellow-800",
};

const GraspopPlanner = () => {
  const { currentUser, isLoading: isUserLoading } = useUser();
  const [bands, setBands] = useState([]);
  const [expandedBand, setExpandedBand] = useState(null);
  const [filterDay, setFilterDay] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRatings, setUserRatings] = useState({});
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeline'
  const [showBucketList, setShowBucketList] = useState(false);

  // Function to detect schedule conflicts
  const getScheduleConflicts = () => {
    const wantToSee = bands.filter(band => {
      const rating = userRatings[band.id];
      return rating && rating.rating >= 4; // 4+ stars means "want to see"
    });

    const conflicts = {};
    wantToSee.forEach(band => {
      const conflictingBands = wantToSee.filter(otherBand => 
        otherBand.id !== band.id && 
        otherBand.day === band.day &&
        otherBand.stage !== band.stage // Different stages on same day = potential conflict
      );
      
      if (conflictingBands.length > 0) {
        conflicts[band.id] = conflictingBands;
      }
    });

    return conflicts;
  };

  // Export schedule functions
  const exportSchedule = (format = 'text') => {
    const mySchedule = bands
      .filter(band => {
        const rating = userRatings[band.id];
        return rating && rating.rating >= 4;
      })
      .sort((a, b) => {
        const dayOrder = { Thursday: 0, Friday: 1, Saturday: 2, Sunday: 3 };
        return dayOrder[a.day] - dayOrder[b.day];
      });

    if (format === 'json') {
      const data = JSON.stringify(mySchedule, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graspop-schedule-${currentUser?.name || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let scheduleText = `🎸 GRASPOP SCHEDULE - ${currentUser?.name || 'User'}\n\n`;
      
      const byDay = _.groupBy(mySchedule, 'day');
      Object.entries(byDay).forEach(([day, dayBands]) => {
        scheduleText += `📅 ${day.toUpperCase()}\n`;
        dayBands.forEach(band => {
          const rating = userRatings[band.id];
          scheduleText += `⭐ ${band.name} - ${band.stage} (${rating.rating}/5 stars)\n`;
          if (rating.notes) {
            scheduleText += `   💭 ${rating.notes}\n`;
          }
        });
        scheduleText += '\n';
      });

      navigator.clipboard.writeText(scheduleText).then(() => {
        alert('Schedule copied to clipboard!');
      });
    }
  };

  // Creative planning helpers
  const getEnergyLevel = (rating) => {
    if (rating >= 5) return { emoji: '🔥', label: 'MUST SEE', color: 'text-red-600' };
    if (rating >= 4) return { emoji: '⭐', label: 'Want to see', color: 'text-yellow-600' };
    if (rating >= 3) return { emoji: '👍', label: 'Interested', color: 'text-green-600' };
    if (rating >= 2) return { emoji: '🤔', label: 'Maybe', color: 'text-blue-600' };
    return { emoji: '❌', label: 'Skip', color: 'text-gray-400' };
  };

  const getRestBreaks = () => {
    const mySchedule = bands
      .filter(band => {
        const rating = userRatings[band.id];
        return rating && rating.rating >= 4;
      })
      .sort((a, b) => {
        const dayOrder = { Thursday: 0, Friday: 1, Saturday: 2, Sunday: 3 };
        return dayOrder[a.day] - dayOrder[b.day];
      });

    const breakSuggestions = [];
    const byDay = _.groupBy(mySchedule, 'day');
    
    Object.entries(byDay).forEach(([day, dayBands]) => {
      if (dayBands.length >= 4) {
        breakSuggestions.push(`${day}: Consider a break after ${Math.floor(dayBands.length/2)} bands`);
      }
    });
    
    return breakSuggestions;
  };

  const getGenreBalance = () => {
    const ratedBands = bands.filter(band => {
      const rating = userRatings[band.id];
      return rating && rating.rating >= 4;
    });

    const genreCounts = {};
    ratedBands.forEach(band => {
      band.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    return Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre, count]) => ({ genre, count }));
  };

  const TimelineView = () => {
    const mySchedule = bands
      .filter(band => {
        const rating = userRatings[band.id];
        return rating && rating.rating >= 4;
      })
      .sort((a, b) => {
        const dayOrder = { Thursday: 0, Friday: 1, Saturday: 2, Sunday: 3 };
        return dayOrder[a.day] - dayOrder[b.day];
      });

    const byDay = _.groupBy(mySchedule, 'day');

    return (
      <div className="space-y-6">
        {Object.entries(byDay).map(([day, dayBands]) => (
          <div key={day} className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
              <Calendar className="mr-2" size={20} />
              {day} - {dayBands.length} bands
            </h3>
            <div className="space-y-3">
              {dayBands.map((band, index) => {
                const rating = userRatings[band.id];
                const energy = getEnergyLevel(rating.rating);
                return (
                  <div key={band.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl mr-3">{energy.emoji}</div>
                    <div className="flex-grow">
                      <div className="font-semibold">{band.name}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {band.stage}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${energy.color}`}>
                      {energy.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const BucketListView = () => {
    const unratedBands = bands.filter(band => !userRatings[band.id] || userRatings[band.id].rating === 0);
    const randomBands = _.shuffle(unratedBands).slice(0, 5);

    return (
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
          🎯 Quick Rate - Band Bucket List
          <button 
            onClick={() => setShowBucketList(false)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </h3>
        <p className="text-sm text-gray-600 mb-4">Rate these random bands quickly to build your schedule:</p>
        <div className="space-y-4">
          {randomBands.map(band => (
            <div key={band.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">{band.name}</div>
                <div className="text-sm text-gray-600">{band.genres.slice(0, 2).join(', ')}</div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => updateBandRating(band.id, { rating })}
                    className="p-1 hover:bg-yellow-100 rounded transition-colors"
                  >
                    <Star
                      size={20}
                      className="text-yellow-400 hover:text-yellow-500"
                      fill="none"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Load bands and ratings data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bands/`);
        const data = await response.json();
        setBands(data);

        // If we have a current user, load their ratings
        if (currentUser) {
          const ratingsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/users/${currentUser.id}/ratings/`
          );
          const ratingsData = await ratingsResponse.json();

          // Convert to a map for easier lookup
          const ratingsMap = ratingsData.reduce((acc, rating) => {
            acc[rating.band_id] = rating;
            return acc;
          }, {});

          setUserRatings(ratingsMap);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Update rating on the backend
  const updateBandRating = async (bandId, updates) => {
    if (!currentUser) return;

    try {
      const existingRating = userRatings[bandId];
      let response;

      if (existingRating) {
        // Update existing rating
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/users/${
            currentUser.id
          }/ratings/${bandId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          }
        );
      } else {
        // Create new rating
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/users/${currentUser.id}/ratings/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              band_id: bandId,
              ...updates,
            }),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedRating = await response.json();
      setUserRatings((prev) => ({
        ...prev,
        [bandId]: updatedRating,
      }));
    } catch (error) {
      console.error("Error updating rating:", error);
      // You might want to add some user feedback here
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-5xl">
          <UserSelection />
        </div>
      </div>
    );
  }

  // Filter and sort bands
  const filteredBands = bands
    .filter((band) => filterDay === "all" || band.day === filterDay)
    .filter(
      (band) =>
        band.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        band.genres.some((genre) =>
          genre.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
    .filter((band) => {
      if (discoveryMode) {
        // In discovery mode, only show unrated bands
        return !userRatings[band.id] || userRatings[band.id].rating === 0;
      }
      return true;
    });

  const sortedBands = _.orderBy(filteredBands, [sortBy], ["asc"]);

  // Calculate stats for current user
  const stats = {
    totalRated: Object.values(userRatings).filter((r) => r.rating > 0).length,
    avgRating:
      _.meanBy(
        Object.values(userRatings).filter((r) => r.rating > 0),
        "rating"
      ).toFixed(1) || "0.0",
    mustSee: Object.values(userRatings).filter((r) => r.rating >= 4).length,
  };

  const restBreaks = getRestBreaks();
  const genreBalance = getGenreBalance();

  // Festival Survival Kit recommendations
  const getSurvivalKit = () => {
    const mustSeeBands = Object.values(userRatings).filter(r => r.rating >= 4).length;
    const kit = [];
    
    if (mustSeeBands >= 10) kit.push("🔋 Portable charger - You'll be taking lots of photos!");
    if (mustSeeBands >= 6) kit.push("💧 Extra water bottle - Long days ahead!");
    if (genreBalance.some(g => g.genre.includes('Metal'))) kit.push("🎧 Earplugs - Protect those ears!");
    if (restBreaks.length > 0) kit.push("🪑 Portable seat - Those breaks will be needed!");
    
    return kit;
  };

  const survivalKit = getSurvivalKit();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-5xl">
        {/* User Selection */}
        <UserSelection />

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl shadow-xl mb-8 p-8 text-white">
          <h1 className="text-3xl font-bold mb-6">Graspop 2025 Rater</h1>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {stats.totalRated}
              </div>
              <div className="text-sm text-gray-300">Bands Rated</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {stats.avgRating}
              </div>
              <div className="text-sm text-gray-300">Average Rating</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {stats.mustSee}
              </div>
              <div className="text-sm text-gray-300">Must-See (4★+)</div>
            </div>
          </div>
        </div>

        {/* Creative Planning Insights */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <Clock className="mr-2" size={20} />
            Festival Planning Insights
          </h3>
          
          {/* Genre Balance */}
          {genreBalance.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Your Music Vibe:</h4>
              <div className="flex flex-wrap gap-2">
                {genreBalance.map(({ genre, count }) => (
                  <span key={genre} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {genre} ({count} bands)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rest Break Suggestions */}
          {restBreaks.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">💪 Stamina Tips:</h4>
              <ul className="space-y-1">
                {restBreaks.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stage Distribution */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🎪 Stage Distribution:</h4>
            <div className="text-sm text-gray-600">
              {Object.entries(_.groupBy(
                bands.filter(band => {
                  const rating = userRatings[band.id];
                  return rating && rating.rating >= 4;
                }), 
                'stage'
              )).map(([stage, stageBands]) => (
                <span key={stage} className="mr-4">
                  {stage}: {stageBands.length}
                </span>
              ))}
            </div>
          </div>

          {/* Survival Kit */}
          {survivalKit.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">🎒 Festival Survival Kit:</h4>
              <ul className="space-y-1">
                {survivalKit.map((item, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start">
                    <span className="mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bucket List */}
        {showBucketList && <BucketListView />}

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Export Your Schedule</h3>
          <div className="flex gap-3">
            <button
              onClick={() => exportSchedule('text')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share size={18} />
              Copy to Clipboard
            </button>
            <button
              onClick={() => exportSchedule('json')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              Download JSON
            </button>
            <button
              onClick={() => setShowBucketList(!showBucketList)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              🎯 Quick Rate
            </button>
          </div>
        </div>

        {/* Filters - remain the same */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-4 flex flex-wrap gap-4">
          <select
            className="px-4 py-2 border rounded-lg bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
          >
            <option value="all">All Days</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>

          <select
            className="px-4 py-2 border rounded-lg bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
            <option value="stage">Sort by Stage</option>
          </select>

          <input
            type="text"
            placeholder="Search bands or genres..."
            className="flex-grow px-4 py-2 border rounded-lg bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            onClick={() => setDiscoveryMode(!discoveryMode)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              discoveryMode 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            🔍 Discovery Mode
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              viewMode === 'timeline' 
                ? 'bg-green-600 text-white border-green-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            {viewMode === 'list' ? <Calendar size={18} /> : <List size={18} />}
            <span className="ml-2">{viewMode === 'list' ? 'Timeline' : 'List'} View</span>
          </button>
        </div>

        {/* Band List or Timeline */}
        {viewMode === 'timeline' ? (
          <TimelineView />
        ) : (
        <div className="space-y-4">
          {sortedBands.map((band) => {
            const userRating = userRatings[band.id] || {};
            const conflicts = getScheduleConflicts();
            const hasConflict = conflicts[band.id];
            return (
              <div
                key={band.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${hasConflict ? 'border-l-4 border-orange-400' : ''}`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex-grow">
                          <h3 className="text-xl font-bold">{band.name}</h3>
                          {hasConflict && (
                            <div className="flex items-center mt-1 text-orange-600 text-sm">
                              <AlertTriangle size={16} className="mr-1" />
                              Schedule conflict with {hasConflict.map(c => c.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-600">
                            {band.day}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              stageColors[band.stage]
                            }`}
                          >
                            {band.stage}
                          </span>
                          <button
                            onClick={() =>
                              setExpandedBand(
                                expandedBand === band.id ? null : band.id
                              )
                            }
                            className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            {expandedBand === band.id ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {band.genres.map((genre, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() =>
                          updateBandRating(band.id, { rating: star })
                        }
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={
                            star <= (userRating.rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                          size={24}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Expanded Content */}
                  {expandedBand === band.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Notes:
                        </label>
                        <textarea
                          value={userRating.notes || ""}
                          onChange={(e) =>
                            updateBandRating(band.id, { notes: e.target.value })
                          }
                          className="w-full p-3 border rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          rows="2"
                          placeholder="Add your notes about this band..."
                        />
                      </div>

                      {/* Facts */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700">
                          Facts:
                        </h4>
                        <ul className="space-y-2">
                          {band.facts.map((fact, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span className="text-gray-600">{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Suggested Songs */}
                      {band.suggested_songs.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-gray-700">
                            Suggested Songs:
                          </h4>
                          <ul className="space-y-2">
                            {band.suggested_songs.map((song, i) => (
                              <li key={i} className="flex items-center">
                                <span className="mr-2">•</span>
                                <span className="text-gray-600">{song}</span>
                                <a
                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                    `${band.name} ${song}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  <Music size={16} className="inline" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Mark as Listened */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          checked={userRating.listened || false}
                          onChange={(e) =>
                            updateBandRating(band.id, {
                              listened: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-600">
                          Listened to this band
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

export default GraspopPlanner;
