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
  const [viewMode, setViewMode] = useState("list"); // 'list', 'timeline', 'conflicts', 'consensus'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [minGroupSize, setMinGroupSize] = useState(2);

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

  const exportGroupSchedule = () => {
    const activeUsers = users.filter((user) => selectedUsers.includes(user.id));
    const conflicts = getTimeConflicts();
    const meetings = getGroupMeetingPoints();

    let scheduleText = `?? GRASPOP GROUP SCHEDULE\n`;
    scheduleText += `?? Group: ${activeUsers
      .map((u) => u.name)
      .join(", ")}\n\n`;

    // Meeting points
    if (meetings.length > 0) {
      scheduleText += `?? MEETING POINTS:\n`;
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
      scheduleText += `?? ${day.toUpperCase()}\n`;
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
          scheduleText += `? ${band.name} - ${band.stage}${timeInfo}\n`;
          scheduleText += `   ?? ${stats.mustSeeCount}/${
            activeUsers.length
          } want to see (${stats.avgRating.toFixed(1)}? avg)\n`;

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

    // Conflicts
    if (Object.keys(conflicts).length > 0) {
      scheduleText += `?? CONFLICTS TO RESOLVE:\n`;
      Object.values(conflicts).forEach((conflict) => {
        scheduleText += `• ${conflict.day} ${conflict.time}: ${conflict.conflicts.length} scheduling conflicts\n`;
      });
    }

    navigator.clipboard.writeText(scheduleText).then(() => {
      alert("Group schedule copied to clipboard!");
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

    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      let adjustedHours = hours;
      if (hours < 11) adjustedHours += 24; // Next day hours
      return (adjustedHours - 11) * 60 + minutes;
    };

    // Calculate dynamic row height based on content
    const calculateRowHeight = (maxColumns) => {
      // Base height for time labels
      const baseHeight = 100;
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
                    const height = Math.max(70, (duration * rowHeight) / 60);

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
                      consensusIcon = "??";
                    } else if (band.stats.consensus === "mild_yes") {
                      consensusColor =
                        "bg-blue-100 border-blue-400 text-blue-800";
                      consensusIcon = "??";
                    } else if (band.stats.mustSeeCount >= minGroupSize) {
                      consensusColor =
                        "bg-yellow-100 border-yellow-400 text-yellow-800";
                      consensusIcon = "?";
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
                        )}? avg`}
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
                  ?? {meeting.attendees.length} people
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

          {/* Export Button */}
          <div className="mb-6">
            <button
              onClick={exportGroupSchedule}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Share size={18} />
              Export Group Schedule
            </button>
          </div>

          {/* Settings for consensus views */}
          {(viewMode === "consensus" || viewMode === "conflicts") && (
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
