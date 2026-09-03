import { Search, UserCircle } from "lucide-react";

type NavbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">SahaSetu</div>

      <div className="navbar-links">
        <button className="nav-link active">Bookings</button>
        <button className="nav-link">History</button>
      </div>

      <div className="navbar-right">
        <div className="search-box">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <UserCircle className="profile-icon" size={32} />
      </div>
    </nav>
  );
}

export default Navbar;