import React, { useState, useEffect } from "react";
import { Star, Music, ChevronDown, ChevronUp } from "lucide-react";
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

  // Load bands and ratings data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`${API_URL}/bands/`);
        const data = await response.json();
        setBands(data);

        // If we have a current user, load their ratings
        if (currentUser) {
          const ratingsResponse = await fetch(
            `${API_URL}/users/${currentUser.id}/ratings/`
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
          `${API_URL}/users/${currentUser.id}/ratings/${bandId}`,
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
        response = await fetch(`${API_URL}/users/${currentUser.id}/ratings/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            band_id: bandId,
            ...updates,
          }),
        });
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
    );

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
        </div>

        {/* Band List */}
        <div className="space-y-4">
          {sortedBands.map((band) => {
            const userRating = userRatings[band.id] || {};
            return (
              <div
                key={band.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">{band.name}</h3>
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
      </div>
    </div>
  );
};

export default GraspopPlanner;
