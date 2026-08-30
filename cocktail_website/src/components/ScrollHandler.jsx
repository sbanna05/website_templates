import { useLocation } from "react-router-dom";
import { useEffect } from "react";

function ScrollHandler() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      // ha nincs hash, simán topra scrolloz
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location]);

  return null;
}

export default ScrollHandler;
