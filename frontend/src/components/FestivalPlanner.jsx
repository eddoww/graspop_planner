import React, { useState, useEffect } from "react";
import { Star, Users, Clock } from "lucide-react";
import _ from "lodash";

const FestivalPlanner = () => {
  const [bands, setBands] = useState([]);
  const [users, setUsers] = useState([]);
  const [allRatings, setAllRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState("all");
  const [sortBy, setSortBy] = useState("avgRating");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all bands
        const bandsResponse = await fetch("http://localhost:3001/bands/");
        const bandsData = await bandsResponse.json();
        setBands(bandsData);

        // Fetch all users
        const usersResponse = await fetch("http://localhost:3001/users/");
        const usersData = await usersResponse.json();
        setUsers(usersData);

        // Fetch ratings for each user
        const allUserRatings = {};
        for (const user of usersData) {
          const ratingsResponse = await fetch(
            `http://localhost:3001/users/${user.id}/ratings/`
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
    const ratings = users
      .map((user) => allRatings[user.id]?.[band.id]?.rating)
      .filter((r) => r !== undefined);

    const ratedCount = ratings.length;
    const totalRating = _.sum(ratings);
    const avgRating = ratedCount > 0 ? _.sum(ratings) / ratedCount : 0;
    const listenedCount = users.filter(
      (user) => allRatings[user.id]?.[band.id]?.listened
    ).length;
    const enthusiasm =
      ratedCount > 0
        ? (ratings.filter((r) => r >= 4).length / ratedCount) * 100
        : 0;

    return {
      avgRating,
      totalRating,
      ratedCount,
      listenedCount,
      enthusiasm,
      ratings: Object.fromEntries(
        users.map((user) => [
          user.id,
          allRatings[user.id]?.[band.id]?.rating || 0,
        ])
      ),
    };
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
            case "ratedCount":
              return stats.ratedCount;
            case "listenedCount":
              return stats.listenedCount;
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-6">Festival Group Planner</h1>

          {/* Filters */}
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
              <option value="enthusiasm">Sort by Enthusiasm</option>
              <option value="ratedCount">Sort by Rating Count</option>
              <option value="listenedCount">Sort by Listened Count</option>
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

          {/* Band List */}
          <div className="space-y-4">
            {sortedBands.map((band) => {
              const stats = calculateBandStats(band);

              return (
                <div
                  key={band.id}
                  className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{band.name}</h3>
                      <div className="text-sm text-gray-600">
                        {band.day} - {band.stage}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {stats.totalRating.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      {/* Average Rating */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-500">
                          {stats.avgRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Average</div>
                      </div>

                      {/* Enthusiasm */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {stats.enthusiasm.toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600">Enthusiasm</div>
                      </div>

                      {/* Rating Count */}
                      <div className="text-center flex items-center gap-1">
                        <Users size={20} className="text-blue-500" />
                        <div>
                          <span className="font-bold">{stats.ratedCount}</span>
                          <span className="text-gray-600">/{users.length}</span>
                        </div>
                      </div>

                      {/* Listened Count */}
                      <div className="text-center flex items-center gap-1">
                        <Clock size={20} className="text-purple-500" />
                        <div>
                          <span className="font-bold">
                            {stats.listenedCount}
                          </span>
                          <span className="text-gray-600">/{users.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Ratings */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {users.map((user) => (
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
        </div>
      </div>
    </div>
  );
};

export default FestivalPlanner;
