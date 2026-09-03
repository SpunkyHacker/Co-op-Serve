export type Worker = {
  id: number;
  name: string;
  service: string;
  skills: string[];
  rating: number;
  reviews: number;
  jobs: number;
  distance: number;
  rate: number;
  experience: number;
  availability: string;
  verified: boolean;
  image: string;
};

export const workers: Worker[] = [
  {
    id: 1,
    name: "Rajesh Kumar",
    service: "Electrician",
    skills: ["Wiring", "Repairs", "Installation"],
    rating: 4.9,
    reviews: 124,
    jobs: 238,
    distance: 1.2,
    rate: 450,
    experience: 8,
    availability: "Available Now",
    verified: true,
    image: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: 2,
    name: "Priya Sharma",
    service: "Plumber",
    skills: ["Pipe Repair", "Leak Fix", "Fittings"],
    rating: 4.8,
    reviews: 96,
    jobs: 187,
    distance: 2.1,
    rate: 400,
    experience: 6,
    availability: "Available in 30m",
    verified: true,
    image: "https://i.pravatar.cc/150?img=47",
  },
  {
    id: 3,
    name: "Amit Patel",
    service: "Carpenter",
    skills: ["Furniture", "Woodwork", "Repair"],
    rating: 4.7,
    reviews: 81,
    jobs: 156,
    distance: 3.5,
    rate: 350,
    experience: 5,
    availability: "Available in 45m",
    verified: true,
    image: "https://i.pravatar.cc/150?img=11",
  },
  {
    id: 4,
    name: "Suresh Singh",
    service: "Technician",
    skills: ["AC Repair", "Appliances", "Maintenance"],
    rating: 4.2,
    reviews: 63,
    jobs: 104,
    distance: 5.4,
    rate: 500,
    experience: 7,
    availability: "Busy — 3 jobs queued",
    verified: true,
    image: "https://i.pravatar.cc/150?img=68",
  },
];