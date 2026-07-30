import React from 'react';
import { Bus, Users, Route, ShieldAlert, Navigation, UserCheck } from 'lucide-react';
import { Bus as BusType, Student } from '../types';

interface DashboardStatsProps {
  buses: BusType[];
  students: Student[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ buses, students }) => {
  const totalBuses = buses.length;
  const totalStudents = students.length;
  const totalRoutes = 3;
  const totalDrivers = 3;
  const activeTrips = buses.filter(b => b.status === 'Running').length;
  
  // Dynamic live count of students who are currently marked "On Board"
  const studentsOnBoard = students.filter(s => s.status === 'On Board').length;

  const statCards = [
    {
      title: 'Total Buses',
      value: totalBuses,
      icon: Bus,
      color: 'from-blue-500/10 to-indigo-500/5 text-blue-600 border-blue-200/50',
      label: 'Fleet Strength'
    },
    {
      title: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'from-emerald-500/10 to-teal-500/5 text-emerald-600 border-emerald-200/50',
      label: 'Enrolled Pupils'
    },
    {
      title: 'Active Routes',
      value: totalRoutes,
      icon: Route,
      color: 'from-purple-500/10 to-fuchsia-500/5 text-purple-600 border-purple-200/50',
      label: 'Coimbatore Loops'
    },
    {
      title: 'Active Drivers',
      value: totalDrivers,
      icon: ShieldAlert,
      color: 'from-amber-500/10 to-orange-500/5 text-amber-600 border-amber-200/50',
      label: 'Verified Operators'
    },
    {
      title: 'Active Trips',
      value: activeTrips,
      icon: Navigation,
      color: 'from-cyan-500/10 to-blue-500/5 text-cyan-600 border-cyan-200/50',
      label: 'Realtime Transit'
    },
    {
      title: 'Students Onboard',
      value: studentsOnBoard,
      icon: UserCheck,
      color: 'from-rose-500/10 to-pink-500/5 text-rose-600 border-rose-200/50',
      label: 'Live Count'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 font-sans">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index}
            className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[105px] bg-gradient-to-br ${card.color} transform hover:scale-105 hover:shadow-md transition-all duration-300`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                {card.title}
              </span>
              <div className="p-1.5 rounded-lg bg-white/60 shadow-sm">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-800 leading-none">{card.value}</h3>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mt-1">
                {card.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
