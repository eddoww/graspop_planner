import React, { useState, useEffect } from "react";
import {
  Star,
  Users,
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Coffee,
  Zap,
  Download,
  Share,
  MessageSquare,
  Target,
  UserCheck,
  Shuffle,
  List,
  FileText,
  GitBranch,
  Utensils,
  Navigation,
  Battery,
  CloudRain,
  DollarSign,
  Camera,
  Bell,
  Heart,
  Brain,
  Route,
  Award,
  Music2,
  Lightbulb,
  CheckCircle,
  XCircle,
} from "lucide-react";
import _ from "lodash";

const FestivalPlanner = () => {
  const [bands, setBands] = useState([]);
  const [users, setUsers] = useState([]);
  const [allRatings, setAllRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState("all");
  const [sortBy, setSortBy] = useState("avgRating");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list', 'timeline', 'conflicts', 'consensus', 'suggestions', 'planner', 'analytics'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [groupNotes, setGroupNotes] = useState({});
  const [budgetTracking, setBudgetTracking] = useState({});
  const [weatherPlan, setWeatherPlan] = useState("sunny");
  const [energyManagement, setEnergyManagement] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bandsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/bands/`
        );
        const bandsData = await bandsResponse.json();
        setBands(bandsData);

        const usersResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/users/`
        );
        const usersData = await usersResponse.json();
        setUsers(usersData);
        setSelectedUsers(usersData.map((u) => u.id)); // Select all users by default

        const allUserRatings = {};
        for (const user of usersData) {
          const ratingsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/users/${user.id}/ratings/`
          );
          const ratingsData = await ratingsResponse.json();
          allUserRatings[user.id] = ratingsData.reduce((acc, rating) => {
            acc[rating.band_id] = rating;
            return acc;
          }, {});
        }
        setAllRatings(allUserRatings);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateBandStats = (band) => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const ratings = activeUsers
      .map((user) => allRatings[user.id]?.[band.id]?.rating)
      .filter((r) => r !== undefined && r > 0);

    const ratedCount = ratings.length;
    const totalRating = _.sum(ratings);
    const avgRating = ratedCount > 0 ? totalRating / ratedCount : 0;
    const listenedCount = activeUsers.filter(
      (user) => allRatings[user.id]?.[band.id]?.listened
    ).length;
    const enthusiasm =
      ratedCount > 0
        ? (ratings.filter((r) => r >= 4).length / ratedCount) * 100
        : 0;
    const mustSeeCount = ratings.filter((r) => r >= 4).length;
    const passCount = ratings.filter((r) => r <= 2).length;
    const controversyScore =
      ratedCount > 1
        ? _.round(
            _.sum(ratings.map((r) => Math.pow(r - avgRating, 2))) / ratedCount,
            2
          )
        : 0;

    // Consensus level
    let consensus = "unknown";
    if (ratedCount >= activeUsers.length * 0.7) {
      if (avgRating >= 4) consensus = "strong_yes";
      else if (avgRating >= 3) consensus = "mild_yes";
      else if (avgRating >= 2) consensus = "mild_no";
      else consensus = "strong_no";
    } else if (ratedCount >= activeUsers.length * 0.3) {
      consensus = "partial";
    } else {
      consensus = "unrated";
    }

    return {
      avgRating,
      totalRating,
      ratedCount,
      listenedCount,
      enthusiasm,
      mustSeeCount,
      passCount,
      controversyScore,
      consensus,
      coverage: (ratedCount / activeUsers.length) * 100,
      ratings: Object.fromEntries(
        activeUsers.map((user) => [
          user.id,
          allRatings[user.id]?.[band.id]?.rating || 0,
        ])
      ),
    };
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    let adjustedHours = hours;
    if (hours < 11) adjustedHours += 24; // Next day hours
    return (adjustedHours - 11) * 60 + minutes;
  };

  const getTimeConflicts = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const conflicts = {};

    activeUsers.forEach((user) => {
      const userWantToSee = bands.filter((band) => {
        const rating = allRatings[user.id]?.[band.id];
        return rating && rating.rating >= 4;
      });

      userWantToSee.forEach((band) => {
        const conflictingBands = userWantToSee.filter((otherBand) => {
          if (otherBand.id === band.id || otherBand.day !== band.day)
            return false;

          if (
            band.start_time &&
            band.end_time &&
            otherBand.start_time &&
            otherBand.end_time
          ) {
            const convertToMinutes = (timeStr) => {
              const [hours, minutes] = timeStr.split(":").map(Number);
              return hours * 60 + minutes;
            };

            const start1 = convertToMinutes(band.start_time);
            const end1 = convertToMinutes(band.end_time);
            const start2 = convertToMinutes(otherBand.start_time);
            const end2 = convertToMinutes(otherBand.end_time);

            return start1 < end2 && start2 < end1;
          }

          return otherBand.stage !== band.stage;
        });

        if (conflictingBands.length > 0) {
          const conflictKey = `${band.day}_${band.start_time || "TBD"}`;
          if (!conflicts[conflictKey]) {
            conflicts[conflictKey] = {
              time: band.start_time || "TBD",
              day: band.day,
              conflicts: [],
            };
          }

          conflicts[conflictKey].conflicts.push({
            user: user,
            bands: [band, ...conflictingBands],
          });
        }
      });
    });

    return conflicts;
  };

  const getGroupMeetingPoints = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const meetings = [];

    // Find bands where most of the group wants to go
    const consensusBands = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.mustSeeCount >= Math.max(2, activeUsers.length * 0.6);
    });

    // Group by day and suggest meeting points
    const byDay = _.groupBy(consensusBands, "day");
    Object.entries(byDay).forEach(([day, dayBands]) => {
      if (dayBands.length > 0) {
        const firstBand = _.minBy(
          dayBands,
          (band) => band.start_time || "99:99"
        );
        const lastBand = _.maxBy(
          dayBands,
          (band) => band.start_time || "00:00"
        );

        meetings.push({
          day,
          type: "group_start",
          time: firstBand.start_time
            ? `${(parseInt(firstBand.start_time.split(":")[0]) - 1)
                .toString()
                .padStart(2, "0")}:${firstBand.start_time.split(":")[1]}`
            : "10:00",
          location: firstBand.stage,
          reason: `Meet before ${firstBand.name}`,
          attendees: activeUsers.filter(
            (user) => allRatings[user.id]?.[firstBand.id]?.rating >= 4
          ),
        });

        if (dayBands.length >= 3) {
          const midPoint = Math.floor(dayBands.length / 2);
          const midBand = dayBands[midPoint];
          meetings.push({
            day,
            type: "regroup",
            time: midBand.start_time || "15:00",
            location: "Main Entrance",
            reason: "Mid-day regroup and food break",
            attendees: activeUsers,
          });
        }
      }
    });

    return meetings;
  };

  // NEW FEATURE: Gap Analysis & Smart Suggestions
  const getScheduleGaps = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const gaps = [];

    ["Thursday", "Friday", "Saturday", "Sunday"].forEach((day) => {
      // Get bands the group wants to see on this day
      const dayWantToSee = bands
        .filter((band) => {
          if (band.day !== day) return false;
          const stats = calculateBandStats(band);
          return stats.mustSeeCount >= minGroupSize;
        })
        .sort((a, b) =>
          (a.start_time || "12:00").localeCompare(b.start_time || "12:00")
        );

      // Find gaps between wanted bands
      for (let i = 0; i < dayWantToSee.length - 1; i++) {
        const currentBand = dayWantToSee[i];
        const nextBand = dayWantToSee[i + 1];

        if (currentBand.end_time && nextBand.start_time) {
          const gapMinutes =
            timeToMinutes(nextBand.start_time) -
            timeToMinutes(currentBand.end_time);

          if (gapMinutes >= 60) {
            // 1+ hour gap
            gaps.push({
              day,
              startTime: currentBand.end_time,
              endTime: nextBand.start_time,
              duration: gapMinutes,
              location:
                currentBand.stage === nextBand.stage
                  ? currentBand.stage
                  : "Between stages",
              type: gapMinutes >= 120 ? "meal_break" : "discovery_time",
            });
          }
        }
      }
    });

    return gaps;
  };

  const getSuggestedBands = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const gaps = getScheduleGaps();
    const suggestions = [];

    // Analyze group music taste
    const likedGenres = {};
    const likedBands = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.avgRating >= 3.5 && stats.ratedCount >= 2;
    });

    likedBands.forEach((band) => {
      band.genres.forEach((genre) => {
        likedGenres[genre] = (likedGenres[genre] || 0) + 1;
      });
    });

    const topGenres = Object.entries(likedGenres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    // Find unrated bands in gaps that match group taste
    gaps.forEach((gap) => {
      const gapBands = bands.filter((band) => {
        if (band.day !== gap.day) return false;
        if (!band.start_time) return false;

        const stats = calculateBandStats(band);
        if (stats.ratedCount >= activeUsers.length * 0.5) return false; // Already well-rated

        const bandStart = timeToMinutes(band.start_time);
        const gapStart = timeToMinutes(gap.startTime);
        const gapEnd = timeToMinutes(gap.endTime);

        return bandStart >= gapStart && bandStart <= gapEnd;
      });

      // Score bands based on genre match
      const scoredBands = gapBands
        .map((band) => {
          const genreMatches = band.genres.filter((genre) =>
            topGenres.includes(genre)
          ).length;
          const score = genreMatches / band.genres.length;
          return { ...band, matchScore: score };
        })
        .filter((band) => band.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      if (scoredBands.length > 0) {
        suggestions.push({
          gap,
          recommendedBands: scoredBands.slice(0, 3),
          reason: `Based on your group's taste for ${topGenres
            .slice(0, 2)
            .join(" and ")}`,
        });
      }
    });

    return suggestions;
  };

  // NEW FEATURE: Energy Management
  const getEnergyOptimizedSchedule = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const wantToSee = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.mustSeeCount >= minGroupSize;
    });

    const energyLevels = {
      "Death Metal": 5,
      "Black Metal": 5,
      "Thrash Metal": 5,
      "Heavy Metal": 4,
      "Power Metal": 4,
      "Progressive Metal": 3,
      "Symphonic Metal": 3,
      "Alternative Metal": 3,
      "Hard Rock": 2,
      Rock: 2,
      Blues: 1,
    };

    const schedule = {};
    ["Thursday", "Friday", "Saturday", "Sunday"].forEach((day) => {
      const dayBands = wantToSee
        .filter((band) => band.day === day)
        .map((band) => ({
          ...band,
          energyLevel: Math.max(
            ...band.genres.map((genre) => energyLevels[genre] || 3)
          ),
        }))
        .sort((a, b) =>
          (a.start_time || "12:00").localeCompare(b.start_time || "12:00")
        );

      let totalEnergy = 0;
      let consecutiveHigh = 0;
      const warnings = [];

      dayBands.forEach((band, index) => {
        totalEnergy += band.energyLevel;

        if (band.energyLevel >= 4) {
          consecutiveHigh++;
          if (consecutiveHigh >= 3) {
            warnings.push(
              `Energy overload around ${band.name} - consider a break`
            );
          }
        } else {
          consecutiveHigh = 0;
        }
      });

      schedule[day] = {
        bands: dayBands,
        totalEnergy,
        avgEnergy: dayBands.length > 0 ? totalEnergy / dayBands.length : 0,
        warnings,
      };
    });

    return schedule;
  };

  // NEW FEATURE: Food & Break Planning
  const getFoodBreakPlan = () => {
    const schedule = getEnergyOptimizedSchedule();
    const foodPlan = {};

    Object.entries(schedule).forEach(([day, daySchedule]) => {
      const breaks = [];
      const bands = daySchedule.bands;

      // Suggested meal times
      breaks.push({
        time: "12:00",
        type: "lunch",
        duration: 45,
        reason: "Fuel up before the main acts",
        location: "Food court",
      });

      if (bands.length >= 4) {
        breaks.push({
          time: "17:30",
          type: "dinner",
          duration: 60,
          reason: "Dinner before evening shows",
          location: "Restaurant area",
        });
      }

      // Energy-based breaks
      daySchedule.warnings.forEach((warning) => {
        breaks.push({
          time: "TBD",
          type: "energy_break",
          duration: 30,
          reason: warning,
          location: "Quiet area",
        });
      });

      foodPlan[day] = breaks;
    });

    return foodPlan;
  };

  // NEW FEATURE: Budget Tracking
  const getBudgetEstimate = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const wantToSee = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.mustSeeCount >= minGroupSize;
    });

    const estimates = {
      food: {
        perDay: 35, // €35 per day per person
        total: 35 * 4 * activeUsers.length,
        breakdown: "Breakfast €8, Lunch €12, Dinner €15",
      },
      drinks: {
        perDay: 25, // €25 per day per person
        total: 25 * 4 * activeUsers.length,
        breakdown: "Beer €4-6, Water €3, Coffee €3",
      },
      merchandise: {
        perBand: 25, // €25 average per band shirt
        estimated:
          Math.min(wantToSee.length * 0.3, 5) * 25 * activeUsers.length,
        breakdown: "T-shirts €20-30, Posters €10-15",
      },
      transport: {
        parking: 15 * 4, // €15 per day parking
        fuel: 50, // Estimated fuel
        total: 110,
      },
    };

    estimates.grandTotal =
      estimates.food.total +
      estimates.drinks.total +
      estimates.merchandise.estimated +
      estimates.transport.total;

    return estimates;
  };

  // NEW FEATURE: Weather Planning
  const getWeatherPlan = () => {
    const plans = {
      sunny: {
        icon: "☀️",
        essentials: [
          "Sunscreen SPF50+",
          "Hat/cap",
          "Sunglasses",
          "Light clothing",
        ],
        warnings: ["Stay hydrated", "Seek shade during breaks"],
        stagePrefs: "Indoor stages during peak sun (12-16h)",
      },
      rainy: {
        icon: "🌧️",
        essentials: [
          "Waterproof jacket",
          "Rain boots",
          "Waterproof bag",
          "Towels",
        ],
        warnings: ["Mud at outdoor stages", "Longer walking times"],
        stagePrefs: "Prioritize covered stages, plan indoor backup acts",
      },
      cloudy: {
        icon: "☁️",
        essentials: ["Light jacket", "Layers", "Umbrella (just in case)"],
        warnings: ["Temperature can drop in evening"],
        stagePrefs: "Perfect weather for any stage",
      },
    };

    return plans[weatherPlan] || plans.sunny;
  };

  // NEW FEATURE: Group Analytics - FIXED
  const getGroupAnalytics = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));

    // Music taste similarity
    const userSimilarity = [];
    activeUsers.forEach((user1) => {
      activeUsers.forEach((user2) => {
        if (user1.id !== user2.id && user1.id < user2.id) {
          // Avoid duplicates and self-comparison
          const user1Ratings = allRatings[user1.id] || {};
          const user2Ratings = allRatings[user2.id] || {};

          const commonBands = bands.filter(
            (band) =>
              user1Ratings[band.id] &&
              user2Ratings[band.id] &&
              user1Ratings[band.id].rating > 0 &&
              user2Ratings[band.id].rating > 0
          );

          if (commonBands.length >= 3) {
            const correlation = _.round(
              1 -
                _.sumBy(commonBands, (band) =>
                  Math.abs(
                    user1Ratings[band.id].rating - user2Ratings[band.id].rating
                  )
                ) /
                  (commonBands.length * 4),
              2
            );

            userSimilarity.push({
              users: [user1.name, user2.name],
              similarity: Math.max(0, correlation),
              commonBands: commonBands.length,
            });
          }
        }
      });
    });

    // Genre analysis
    const genrePreferences = {};
    activeUsers.forEach((user) => {
      const userRatings = allRatings[user.id] || {};
      genrePreferences[user.name] = {};

      bands.forEach((band) => {
        const rating = userRatings[band.id];
        if (rating && rating.rating >= 4) {
          band.genres.forEach((genre) => {
            genrePreferences[user.name][genre] =
              (genrePreferences[user.name][genre] || 0) + 1;
          });
        }
      });
    });

    // Group stats
    const allUserRatings = Object.values(allRatings).flatMap((userRatings) =>
      Object.values(userRatings)
        .filter((r) => r.rating > 0)
        .map((r) => r.rating)
    );

    return {
      userSimilarity: userSimilarity.sort(
        (a, b) => b.similarity - a.similarity
      ),
      genrePreferences,
      groupStats: {
        totalRated: _.sum(
          Object.values(allRatings).map(
            (userRatings) =>
              Object.values(userRatings).filter((r) => r.rating > 0).length
          )
        ),
        avgGroupRating:
          allUserRatings.length > 0 ? _.round(_.mean(allUserRatings), 2) : 0,
      },
    };
  };

  // NEW VIEW: Smart Suggestions
  const SuggestionsView = () => {
    const suggestions = getSuggestedBands();
    const gaps = getScheduleGaps();

    return (
      <div className="space-y-6">
        {/* Gap Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-blue-600">
            <Clock className="mr-2" />
            Schedule Gaps Analysis
          </h3>

          {gaps.length === 0 ? (
            <div className="text-gray-600 flex items-center">
              <CheckCircle className="mr-2 text-green-500" />
              Your schedule is packed! No significant gaps found.
            </div>
          ) : (
            <div className="space-y-4">
              {gaps.map((gap, index) => (
                <div
                  key={index}
                  className="border border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-800">
                      {gap.day} - {gap.startTime} to {gap.endTime}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        gap.type === "meal_break"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {gap.type === "meal_break"
                        ? "🍽️ Perfect for meals"
                        : "🔍 Discovery time"}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {Math.floor(gap.duration / 60)}h {gap.duration % 60}m gap at{" "}
                    {gap.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Band Suggestions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-purple-600">
            <Lightbulb className="mr-2" />
            Smart Band Suggestions
          </h3>

          {suggestions.length === 0 ? (
            <div className="text-gray-600">
              No suggestions right now - your schedule is well optimized or you
              need to rate more bands!
            </div>
          ) : (
            <div className="space-y-6">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border border-purple-200 rounded-lg p-4 bg-purple-50"
                >
                  <div className="mb-3">
                    <h4 className="font-semibold text-purple-800">
                      {suggestion.gap.day} - {suggestion.gap.startTime} to{" "}
                      {suggestion.gap.endTime}
                    </h4>
                    <p className="text-sm text-purple-700 italic">
                      {suggestion.reason}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {suggestion.recommendedBands.map((band) => (
                      <div
                        key={band.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{band.name}</div>
                          <div className="text-sm text-gray-600">
                            {band.stage} - {band.start_time || "TBD"}
                          </div>
                          <div className="text-xs text-purple-600">
                            Genres: {band.genres.join(", ")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-purple-700 font-bold">
                            {Math.round(band.matchScore * 100)}% match
                          </div>
                          <div className="flex gap-1 mt-1">
                            {[3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => {
                                  console.log(
                                    `Quick rate ${band.name} with ${rating} stars`
                                  );
                                  alert(
                                    `Quick rated ${band.name} with ${rating} stars!`
                                  );
                                }}
                                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                {rating}★
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // NEW VIEW: Day Planner
  const PlannerView = () => {
    const energySchedule = getEnergyOptimizedSchedule();
    const foodPlan = getFoodBreakPlan();
    const budget = getBudgetEstimate();
    const weather = getWeatherPlan();

    return (
      <div className="space-y-6">
        {/* Weather Planning */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-blue-600">
            <CloudRain className="mr-2" />
            Weather Planning
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Weather:
            </label>
            <select
              value={weatherPlan}
              onChange={(e) => setWeatherPlan(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="sunny">☀️ Sunny</option>
              <option value="rainy">🌧️ Rainy</option>
              <option value="cloudy">☁️ Cloudy</option>
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <Utensils className="mr-2" size={18} />
                Essentials
              </h4>
              <ul className="text-sm space-y-1">
                {weather.essentials.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle size={14} className="mr-2 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <AlertTriangle className="mr-2" size={18} />
                Warnings
              </h4>
              <ul className="text-sm space-y-1">
                {weather.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <Bell
                      size={14}
                      className="mr-2 text-yellow-600 mt-0.5 flex-shrink-0"
                    />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                <Navigation className="mr-2" size={18} />
                Stage Strategy
              </h4>
              <p className="text-sm text-green-700">{weather.stagePrefs}</p>
            </div>
          </div>
        </div>

        {/* Energy Management */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-orange-600">
            <Battery className="mr-2" />
            Energy Management
          </h3>

          <div className="space-y-4">
            {Object.entries(energySchedule).map(([day, schedule]) => (
              <div
                key={day}
                className="border border-orange-200 rounded-lg p-4 bg-orange-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-orange-800">{day}</h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-orange-700">
                      Avg Energy: {schedule.avgEnergy.toFixed(1)}/5
                    </span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-3 h-3 mx-0.5 rounded ${
                            level <= schedule.avgEnergy
                              ? "bg-orange-500"
                              : "bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {schedule.warnings.length > 0 && (
                  <div className="mb-3">
                    {schedule.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="flex items-center text-sm text-orange-700"
                      >
                        <AlertTriangle size={14} className="mr-2" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {schedule.bands.map((band) => (
                    <div key={band.id} className="bg-white p-2 rounded text-xs">
                      <div className="font-medium truncate">{band.name}</div>
                      <div className="flex items-center justify-between">
                        <span>{band.start_time}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-1.5 h-1.5 mx-0.5 rounded ${
                                level <= band.energyLevel
                                  ? "bg-red-500"
                                  : "bg-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Food & Break Planning */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-green-600">
            <Utensils className="mr-2" />
            Food & Break Planning
          </h3>

          <div className="space-y-4">
            {Object.entries(foodPlan).map(([day, breaks]) => (
              <div
                key={day}
                className="border border-green-200 rounded-lg p-4 bg-green-50"
              >
                <h4 className="font-semibold text-green-800 mb-3">{day}</h4>
                <div className="space-y-2">
                  {breaks.map((breakItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded"
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            breakItem.type === "lunch"
                              ? "bg-yellow-500"
                              : breakItem.type === "dinner"
                              ? "bg-orange-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium">
                            {breakItem.time} -{" "}
                            {breakItem.type.replace("_", " ")}
                          </div>
                          <div className="text-sm text-gray-600">
                            {breakItem.reason}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {breakItem.duration}min at {breakItem.location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Planning */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-purple-600">
            <DollarSign className="mr-2" />
            Budget Estimate
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {Object.entries(budget)
                .filter(([key]) => key !== "grandTotal")
                .map(([category, data]) => (
                  <div
                    key={category}
                    className="border border-purple-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-800 capitalize">
                        {category.replace(/([A-Z])/g, " $1").trim()}
                      </h4>
                      <span className="text-purple-700 font-bold">
                        €{data.total || data.estimated || data.perDay}
                      </span>
                    </div>
                    <div className="text-sm text-purple-600">
                      {data.breakdown}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-800 mb-2">
                  €{budget.grandTotal}
                </div>
                <div className="text-purple-600">Total Estimated Cost</div>
                <div className="text-sm text-purple-500 mt-2">
                  €
                  {Math.round(
                    budget.grandTotal /
                      users.filter((u) => selectedUsers.includes(u.id)).length
                  )}{" "}
                  per person
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW VIEW: Group Analytics
  const AnalyticsView = () => {
    const analytics = getGroupAnalytics();

    return (
      <div className="space-y-6">
        {/* Group Stats Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-green-600">
            <Award className="mr-2" />
            Group Overview
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700">
                {analytics.groupStats.totalRated}
              </div>
              <div className="text-green-600">Total Ratings</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-700">
                {analytics.groupStats.avgGroupRating}
              </div>
              <div className="text-blue-600">Average Rating</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-700">
                {users.filter((u) => selectedUsers.includes(u.id)).length}
              </div>
              <div className="text-purple-600">Active Members</div>
            </div>
          </div>
        </div>

        {/* User Similarity */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-blue-600">
            <Heart className="mr-2" />
            Music Taste Compatibility
          </h3>

          {analytics.userSimilarity.length === 0 ? (
            <div className="text-gray-600">
              Rate more bands to see compatibility analysis!
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.userSimilarity.slice(0, 5).map((pair, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {pair.users[0]} & {pair.users[1]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {pair.commonBands} bands rated by both
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">
                      {Math.round(pair.similarity * 100)}%
                    </div>
                    <div className="text-sm text-blue-600">Compatible</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Genre Preferences */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-purple-600">
            <Music2 className="mr-2" />
            Genre Preferences by User
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(analytics.genrePreferences).map(
              ([userName, genres]) => (
                <div
                  key={userName}
                  className="border border-purple-200 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-purple-800 mb-3">
                    {userName}
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(genres)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([genre, count]) => (
                        <div
                          key={genre}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{genre}</span>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (count /
                                      Math.max(...Object.values(genres))) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const exportGroupSchedule = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const conflicts = getTimeConflicts();
    const meetings = getGroupMeetingPoints();
    const suggestions = getSuggestedBands();
    const budget = getBudgetEstimate();
    const weather = getWeatherPlan();

    let scheduleText = `🎸 GRASPOP GROUP SCHEDULE\n`;
    scheduleText += `👥 Group: ${activeUsers
      .map((u) => u.name)
      .join(", ")}\n\n`;

    // Weather plan
    scheduleText += `🌤️ WEATHER PLAN (${weatherPlan}):\n`;
    scheduleText += `Essential items: ${weather.essentials.join(", ")}\n`;
    scheduleText += `Strategy: ${weather.stagePrefs}\n\n`;

    // Budget summary
    scheduleText += `💰 BUDGET ESTIMATE:\n`;
    scheduleText += `Total: €${budget.grandTotal} (€${Math.round(
      budget.grandTotal / activeUsers.length
    )} per person)\n\n`;

    // Meeting points
    if (meetings.length > 0) {
      scheduleText += `📍 MEETING POINTS:\n`;
      meetings.forEach((meeting) => {
        scheduleText += `• ${meeting.day} ${meeting.time} - ${meeting.location} (${meeting.reason})\n`;
      });
      scheduleText += "\n";
    }

    // Consensus bands by day
    const consensusBands = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.mustSeeCount >= minGroupSize;
    });

    const byDay = _.groupBy(consensusBands, "day");
    Object.entries(byDay).forEach(([day, dayBands]) => {
      scheduleText += `📅 ${day.toUpperCase()}\n`;
      dayBands
        .sort((a, b) =>
          (a.start_time || "99:99").localeCompare(b.start_time || "99:99")
        )
        .forEach((band) => {
          const stats = calculateBandStats(band);
          const timeInfo =
            band.start_time && band.end_time
              ? ` ${band.start_time}-${band.end_time}`
              : "";
          scheduleText += `⭐ ${band.name} - ${band.stage}${timeInfo}\n`;
          scheduleText += `   👥 ${stats.mustSeeCount}/${
            activeUsers.length
          } want to see (${stats.avgRating.toFixed(1)}★ avg)\n`;

          const attendees = activeUsers.filter((user) => {
            const rating = allRatings[user.id]?.[band.id];
            return rating && rating.rating >= 4;
          });
          scheduleText += `   Going: ${attendees
            .map((u) => u.name)
            .join(", ")}\n`;
        });
      scheduleText += "\n";
    });

    // Suggestions
    if (suggestions.length > 0) {
      scheduleText += `💡 DISCOVERY SUGGESTIONS:\n`;
      suggestions.forEach((suggestion) => {
        scheduleText += `• ${suggestion.gap.day} ${suggestion.gap.startTime}-${suggestion.gap.endTime}:\n`;
        suggestion.recommendedBands.forEach((band) => {
          scheduleText += `  - ${band.name} (${Math.round(
            band.matchScore * 100
          )}% match)\n`;
        });
      });
      scheduleText += "\n";
    }

    // Conflicts
    if (Object.keys(conflicts).length > 0) {
      scheduleText += `⚠️ CONFLICTS TO RESOLVE:\n`;
      Object.values(conflicts).forEach((conflict) => {
        scheduleText += `• ${conflict.day} ${conflict.time}: ${conflict.conflicts.length} scheduling conflicts\n`;
      });
    }

    navigator.clipboard.writeText(scheduleText).then(() => {
      alert("Comprehensive group schedule copied to clipboard!");
    });
  };

  const TimelineView = () => {
    const days = ["Thursday", "Friday", "Saturday", "Sunday"];
    const timeSlots = [];

    // Generate time slots from 11:00 to 02:00 (next day)
    for (let hour = 11; hour <= 26; hour++) {
      const displayHour = hour > 24 ? hour - 24 : hour;
      timeSlots.push(`${displayHour.toString().padStart(2, "0")}:00`);
    }

    // Function to detect overlapping bands and assign columns
    const assignColumns = (dayBands) => {
      const bandsWithPositions = dayBands.map((band) => {
        const startTime = band.start_time || "12:00";
        const endTime =
          band.end_time ||
          `${(parseInt(startTime.split(":")[0]) + 1)
            .toString()
            .padStart(2, "0")}:${startTime.split(":")[1]}`;

        return {
          ...band,
          startMinutes: timeToMinutes(startTime),
          endMinutes: timeToMinutes(endTime),
          column: 0,
          stats: calculateBandStats(band),
        };
      });

      // Sort by start time
      bandsWithPositions.sort((a, b) => a.startMinutes - b.startMinutes);

      // Assign columns to avoid overlaps
      const columns = [];
      bandsWithPositions.forEach((band) => {
        let assignedColumn = 0;

        // Find the first column where this band doesn't overlap
        while (assignedColumn < columns.length) {
          const lastBandInColumn = columns[assignedColumn];
          if (
            !lastBandInColumn ||
            lastBandInColumn.endMinutes <= band.startMinutes
          ) {
            break;
          }
          assignedColumn++;
        }

        band.column = assignedColumn;
        columns[assignedColumn] = band;
      });

      return { bands: bandsWithPositions, maxColumns: columns.length };
    };

    // Calculate dynamic row height based on content
    const calculateRowHeight = (maxColumns) => {
      // Base height for time labels
      const baseHeight = 60;
      // Add extra height if there are many columns (more text per row)
      const extraHeight = maxColumns > 3 ? 20 : 0;
      return baseHeight + extraHeight;
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center">
          <Calendar className="mr-2" />
          Group Timeline View
        </h3>

        {days.map((day) => {
          const dayBands = bands
            .filter((band) => band.day === day)
            .filter((band) => {
              const stats = calculateBandStats(band);
              return stats.mustSeeCount >= minGroupSize || stats.coverage >= 30;
            });

          if (dayBands.length === 0) return null;

          const { bands: positionedBands, maxColumns } =
            assignColumns(dayBands);
          const rowHeight = calculateRowHeight(maxColumns);

          return (
            <div key={day} className="mb-8">
              <h4 className="text-lg font-semibold mb-4 text-gray-800">
                {day}
              </h4>
              <div className="relative flex">
                {/* Timeline */}
                <div className="w-20 bg-gray-50 border-r flex-shrink-0">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="border-b border-gray-200 flex items-center justify-center text-xs text-gray-500"
                      style={{ height: `${rowHeight}px` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Bands container */}
                <div
                  className="flex-1 relative"
                  style={{ minHeight: `${timeSlots.length * rowHeight}px` }}
                >
                  {positionedBands.map((band) => {
                    const topPosition = (band.startMinutes * rowHeight) / 60;
                    const duration = band.endMinutes - band.startMinutes;
                    const height = Math.max(50, (duration * rowHeight) / 60);

                    const columnWidth = maxColumns > 0 ? 100 / maxColumns : 100;
                    const leftPosition = band.column * columnWidth;
                    const width = columnWidth - 1; // Small gap between columns

                    // Simplified consensus indicators
                    let consensusColor =
                      "bg-gray-100 border-gray-300 text-gray-700";
                    let consensusIcon = "";
                    if (band.stats.consensus === "strong_yes") {
                      consensusColor =
                        "bg-green-100 border-green-400 text-green-800";
                      consensusIcon = "🔥";
                    } else if (band.stats.consensus === "mild_yes") {
                      consensusColor =
                        "bg-blue-100 border-blue-400 text-blue-800";
                      consensusIcon = "👍";
                    } else if (band.stats.mustSeeCount >= minGroupSize) {
                      consensusColor =
                        "bg-yellow-100 border-yellow-400 text-yellow-800";
                      consensusIcon = "⭐";
                    }

                    return (
                      <div
                        key={band.id}
                        className={`absolute p-2 rounded border-l-4 ${consensusColor} hover:shadow-md transition-shadow cursor-pointer`}
                        style={{
                          top: `${topPosition}px`,
                          left: `${leftPosition}%`,
                          width: `${width}%`,
                          height: `${height}px`,
                          zIndex: 10,
                          minHeight: "50px",
                        }}
                        title={`${band.name} - ${band.stage} (${
                          band.start_time || "TBD"
                        }-${band.end_time || "TBD"}) - ${
                          band.stats.mustSeeCount
                        }/${
                          users.filter((u) => selectedUsers.includes(u.id))
                            .length
                        } want to see - ${band.stats.avgRating.toFixed(
                          1
                        )}★ avg`}
                      >
                        {/* Band name - always visible */}
                        <div className="font-semibold text-sm leading-tight">
                          {band.name}
                        </div>

                        {/* Stage and consensus indicator */}
                        <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
                          <span>{band.stage}</span>
                          {consensusIcon && <span>{consensusIcon}</span>}
                        </div>

                        {/* Time - only if we have space */}
                        {height > 70 && band.start_time && band.end_time && (
                          <div className="text-xs text-blue-600 font-mono mt-1">
                            {band.start_time}-{band.end_time}
                          </div>
                        )}

                        {/* Stats - only if we have space and it's important */}
                        {height > 90 && band.stats.mustSeeCount > 0 && (
                          <div className="text-xs mt-2 flex items-center justify-between">
                            <span className="flex items-center">
                              <Users size={10} className="mr-1" />
                              {band.stats.mustSeeCount}
                            </span>
                            <span className="flex items-center">
                              <Star size={10} className="mr-1" />
                              {band.stats.avgRating.toFixed(1)}
                            </span>
                          </div>
                        )}

                        {/* Controversy warning - only for very divisive bands */}
                        {height > 70 && band.stats.controversyScore > 2 && (
                          <div className="text-xs text-orange-600 mt-1 flex items-center">
                            <AlertTriangle size={10} className="mr-1" />
                            Divisive
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ConflictsView = () => {
    const conflicts = getTimeConflicts();

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-orange-600">
            <AlertTriangle className="mr-2" />
            Schedule Conflicts ({Object.keys(conflicts).length})
          </h3>

          {Object.keys(conflicts).length === 0 ? (
            <div className="text-green-600 flex items-center">
              <UserCheck className="mr-2" />
              No major conflicts detected! Great job planning.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(conflicts).map(([conflictKey, conflict]) => (
                <div
                  key={conflictKey}
                  className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                >
                  <h4 className="font-semibold text-orange-800 mb-2">
                    {conflict.day} at {conflict.time}
                  </h4>
                  {conflict.conflicts.map((userConflict, index) => (
                    <div key={index} className="mb-3">
                      <div className="font-medium text-gray-700">
                        {userConflict.user.name} wants to see:
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userConflict.bands.map((band) => (
                          <span
                            key={band.id}
                            className="bg-white px-2 py-1 rounded text-sm border"
                          >
                            {band.name} ({band.stage})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 p-2 bg-white rounded text-sm">
                    <div className="flex items-center font-medium mb-1">
                      <MessageSquare className="mr-2" size={16} />
                      Resolution ideas:
                    </div>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      <li>
                        Split the group and meet at the next consensus band
                      </li>
                      <li>Vote on the highest priority band for the group</li>
                      <li>
                        Check if any bands have shorter sets to catch multiple
                      </li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Point Suggestions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-blue-600">
            <Coffee className="mr-2" />
            Suggested Meeting Points
          </h3>
          <div className="space-y-3">
            {getGroupMeetingPoints().map((meeting, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {meeting.day} - {meeting.time}
                  </div>
                  <div className="text-sm text-gray-600">{meeting.reason}</div>
                  <div className="text-sm text-blue-600 flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {meeting.location}
                  </div>
                </div>
                <div className="text-sm">
                  👥 {meeting.attendees.length} people
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ConsensusView = () => {
    const consensusBands = bands
      .map((band) => ({
        ...band,
        stats: calculateBandStats(band),
      }))
      .filter((band) => band.stats.ratedCount >= 2);

    const strongYes = consensusBands.filter(
      (b) => b.stats.consensus === "strong_yes"
    );
    const mildYes = consensusBands.filter(
      (b) => b.stats.consensus === "mild_yes"
    );
    const divisive = consensusBands
      .filter((b) => b.stats.controversyScore > 1.5)
      .sort((a, b) => b.stats.controversyScore - a.stats.controversyScore);
    const unrated = bands.filter((band) => {
      const stats = calculateBandStats(band);
      return stats.coverage < 30;
    });

    return (
      <div className="space-y-6">
        {/* Group Consensus */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center text-green-600">
            <Target className="mr-2" />
            Group Consensus Bands ({strongYes.length + mildYes.length})
          </h3>

          {strongYes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-green-700 mb-3 flex items-center">
                <Zap className="mr-2" size={18} />
                Must-See (Strong Consensus)
              </h4>
              <div className="grid gap-3">
                {strongYes.map((band) => (
                  <div
                    key={band.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div>
                      <div className="font-medium">{band.name}</div>
                      <div className="text-sm text-gray-600">
                        {band.day} - {band.stage}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-700 font-bold flex items-center">
                        {band.stats.avgRating.toFixed(1)}
                        <Star className="ml-1" size={16} fill="currentColor" />
                      </div>
                      <div className="text-sm flex items-center">
                        <Users className="mr-1" size={12} />
                        {band.stats.mustSeeCount}/
                        {
                          users.filter((u) => selectedUsers.includes(u.id))
                            .length
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mildYes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-blue-700 mb-3 flex items-center">
                <TrendingUp className="mr-2" size={18} />
                Good Options (Mild Consensus)
              </h4>
              <div className="grid gap-3">
                {mildYes.slice(0, 10).map((band) => (
                  <div
                    key={band.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div>
                      <div className="font-medium">{band.name}</div>
                      <div className="text-sm text-gray-600">
                        {band.day} - {band.stage}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-700 font-bold flex items-center">
                        {band.stats.avgRating.toFixed(1)}
                        <Star className="ml-1" size={16} fill="currentColor" />
                      </div>
                      <div className="text-sm flex items-center">
                        <Users className="mr-1" size={12} />
                        {band.stats.mustSeeCount}/
                        {
                          users.filter((u) => selectedUsers.includes(u.id))
                            .length
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divisive Bands */}
        {divisive.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center text-orange-600">
              <TrendingDown className="mr-2" />
              Divisive Bands (Need Discussion)
            </h3>
            <div className="space-y-3">
              {divisive.slice(0, 10).map((band) => (
                <div
                  key={band.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div>
                    <div className="font-medium">{band.name}</div>
                    <div className="text-sm text-gray-600">
                      {band.day} - {band.stage}
                    </div>
                    <div className="text-xs text-orange-600">
                      Controversy Score: {band.stats.controversyScore}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-700 font-bold flex items-center">
                      {band.stats.avgRating.toFixed(1)}
                      <Star className="ml-1" size={16} fill="currentColor" />
                    </div>
                    <div className="text-sm">
                      Range:{" "}
                      {Math.min(
                        ...Object.values(band.stats.ratings).filter(
                          (r) => r > 0
                        )
                      )}
                      -{Math.max(...Object.values(band.stats.ratings))}
                      <Star className="ml-1" size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unrated Bands */}
        {unrated.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center text-gray-600">
              <MessageSquare className="mr-2" />
              Needs More Input ({unrated.length} bands)
            </h3>
            <div className="text-sm text-gray-600 mb-3">
              These bands haven't been rated by enough group members. Consider
              rating them!
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {unrated.slice(0, 12).map((band) => (
                <div key={band.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{band.name}</div>
                  <div className="text-xs text-gray-500">
                    {band.day} - {band.stage}
                  </div>
                </div>
              ))}
            </div>
            {unrated.length > 12 && (
              <div className="text-sm text-gray-500 mt-2">
                ...and {unrated.length - 12} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center p-8">Loading festival data...</div>;
  }

  const getBandsSortedAndFiltered = () => {
    let filteredBands = bands.filter(
      (band) =>
        (filterDay === "all" || band.day === filterDay) &&
        band.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedBands = _.orderBy(
      filteredBands,
      [
        (band) => {
          const stats = calculateBandStats(band);
          switch (sortBy) {
            case "avgRating":
              return stats.avgRating;
            case "enthusiasm":
              return stats.enthusiasm;
            case "mustSeeCount":
              return stats.mustSeeCount;
            case "controversy":
              return stats.controversyScore;
            case "coverage":
              return stats.coverage;
            default:
              return band.name.toLowerCase();
          }
        },
      ],
      [sortBy === "name" ? "asc" : "desc"]
    );

    return sortedBands;
  };

  const sortedBands = getBandsSortedAndFiltered();
  const activeUsers = users.filter((user) => selectedUsers.includes(user.id));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-6">Festival Group Planner</h1>

          {/* User Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Group Members:
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => (
                <label key={user.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(
                          selectedUsers.filter((id) => id !== user.id)
                        );
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {user.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "list", label: "Band List", icon: List },
                { key: "timeline", label: "Timeline", icon: Calendar },
                { key: "conflicts", label: "Conflicts", icon: AlertTriangle },
                { key: "consensus", label: "Consensus", icon: Target },
                {
                  key: "suggestions",
                  label: "Smart Suggestions",
                  icon: Lightbulb,
                },
                { key: "planner", label: "Day Planner", icon: Route },
                { key: "analytics", label: "Group Analytics", icon: Brain },
              ].map((view) => {
                const IconComponent = view.icon;
                return (
                  <button
                    key={view.key}
                    onClick={() => setViewMode(view.key)}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                      viewMode === view.key
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <IconComponent size={18} />
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportGroupSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Share size={18} />
                Export Full Schedule
              </button>

              <button
                onClick={() => {
                  const budget = getBudgetEstimate();
                  const budgetText =
                    `💰 GRASPOP BUDGET BREAKDOWN\n\n` +
                    `Food: €${budget.food.total}\n` +
                    `Drinks: €${budget.drinks.total}\n` +
                    `Merchandise: €${budget.merchandise.estimated}\n` +
                    `Transport: €${budget.transport.total}\n\n` +
                    `TOTAL: €${budget.grandTotal}\n` +
                    `Per person: €${Math.round(
                      budget.grandTotal /
                        users.filter((u) => selectedUsers.includes(u.id)).length
                    )}`;
                  navigator.clipboard.writeText(budgetText);
                  alert("Budget breakdown copied!");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <DollarSign size={18} />
                Export Budget
              </button>

              <button
                onClick={() => {
                  const conflicts = getTimeConflicts();
                  if (Object.keys(conflicts).length === 0) {
                    alert("No conflicts to export - great planning!");
                    return;
                  }

                  let conflictText = `⚠️ GRASPOP SCHEDULE CONFLICTS\n\n`;
                  Object.values(conflicts).forEach((conflict) => {
                    conflictText += `${conflict.day} at ${conflict.time}:\n`;
                    conflict.conflicts.forEach((userConflict) => {
                      conflictText += `• ${
                        userConflict.user.name
                      }: ${userConflict.bands
                        .map((b) => `${b.name} (${b.stage})`)
                        .join(" vs ")}\n`;
                    });
                    conflictText += "\n";
                  });

                  navigator.clipboard.writeText(conflictText);
                  alert("Conflicts list copied!");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <AlertTriangle size={18} />
                Export Conflicts
              </button>

              <button
                onClick={() => {
                  const analytics = getGroupAnalytics();
                  let analyticsText = `📊 GRASPOP GROUP ANALYTICS\n\n`;
                  analyticsText += `Group Stats:\n`;
                  analyticsText += `• Total ratings: ${analytics.groupStats.totalRated}\n`;
                  analyticsText += `• Average rating: ${analytics.groupStats.avgGroupRating}\n\n`;

                  if (analytics.userSimilarity.length > 0) {
                    analyticsText += `Music Compatibility:\n`;
                    analytics.userSimilarity.slice(0, 3).forEach((pair) => {
                      analyticsText += `• ${pair.users[0]} & ${
                        pair.users[1]
                      }: ${Math.round(pair.similarity * 100)}% compatible\n`;
                    });
                  }

                  navigator.clipboard.writeText(analyticsText);
                  alert("Analytics summary copied!");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Brain size={18} />
                Export Analytics
              </button>
            </div>
          </div>

          {/* Settings for various views */}
          {(viewMode === "consensus" ||
            viewMode === "conflicts" ||
            viewMode === "suggestions") && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum group size for consensus: {minGroupSize}
              </label>
              <input
                type="range"
                min="1"
                max={activeUsers.length}
                value={minGroupSize}
                onChange={(e) => setMinGroupSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {viewMode === "planner" && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={energyManagement}
                    onChange={(e) => setEnergyManagement(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Enable energy management warnings
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Filters (for list view) */}
          {viewMode === "list" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <select
                className="px-4 py-2 border rounded-lg"
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
                className="px-4 py-2 border rounded-lg"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="avgRating">Sort by Average Rating</option>
                <option value="mustSeeCount">Sort by Must-See Count</option>
                <option value="controversy">Sort by Controversy</option>
                <option value="coverage">Sort by Coverage</option>
                <option value="name">Sort by Name</option>
              </select>

              <input
                type="text"
                placeholder="Search bands..."
                className="px-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content based on view mode */}
        {viewMode === "timeline" && <TimelineView />}
        {viewMode === "conflicts" && <ConflictsView />}
        {viewMode === "consensus" && <ConsensusView />}
        {viewMode === "suggestions" && <SuggestionsView />}
        {viewMode === "planner" && <PlannerView />}
        {viewMode === "analytics" && <AnalyticsView />}

        {/* Band List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {sortedBands.map((band) => {
              const stats = calculateBandStats(band);
              let consensusColor = "bg-gray-50";
              let consensusLabel = "No consensus";

              if (stats.consensus === "strong_yes") {
                consensusColor = "bg-green-50 border-l-4 border-green-400";
                consensusLabel = "Strong Yes";
              } else if (stats.consensus === "mild_yes") {
                consensusColor = "bg-blue-50 border-l-4 border-blue-400";
                consensusLabel = "Mild Yes";
              } else if (stats.mustSeeCount >= minGroupSize) {
                consensusColor = "bg-yellow-50 border-l-4 border-yellow-400";
                consensusLabel = "Group Interest";
              } else if (stats.controversyScore > 1.5) {
                consensusColor = "bg-orange-50 border-l-4 border-orange-400";
                consensusLabel = "Divisive";
              }

              return (
                <div
                  key={band.id}
                  className={`rounded-lg p-4 hover:shadow-md transition-shadow ${consensusColor}`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{band.name}</h3>
                        <span className="px-2 py-1 bg-white rounded-full text-xs border">
                          {consensusLabel}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {band.day} - {band.stage}
                        {band.start_time && band.end_time && (
                          <span className="ml-2 text-blue-600 font-mono">
                            {band.start_time}-{band.end_time}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-500">
                          {stats.avgRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Average</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {stats.mustSeeCount}
                        </div>
                        <div className="text-sm text-gray-600">Must-See</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          {stats.coverage.toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600">Coverage</div>
                      </div>

                      {stats.controversyScore > 1 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-500">
                            {stats.controversyScore.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Controversy
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual User Ratings */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {activeUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-full"
                      >
                        <span className="text-sm font-medium">{user.name}</span>
                        <div className="flex items-center">
                          {stats.ratings[user.id] > 0 ? (
                            <div className="flex items-center">
                              <Star
                                size={16}
                                className="fill-yellow-400 text-yellow-400"
                              />
                              <span className="ml-1">
                                {stats.ratings[user.id]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Not rated
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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

export default FestivalPlanner;
