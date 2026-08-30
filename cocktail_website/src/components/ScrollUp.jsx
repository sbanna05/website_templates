import { useEffect } from "react";

function ScrollUp() {
  useEffect(() => {
    const scrollUp = () => {
      const scrollButton = document.getElementById("scroll-up");
      if (window.scrollY > 200) { // amikor a scroll elér 200px-t
        scrollButton.classList.add("show-scroll");
      } else {
        scrollButton.classList.remove("show-scroll");
      }
    };

    window.addEventListener("scroll", scrollUp);
    return () => window.removeEventListener("scroll", scrollUp);
  }, []);

  return (
    <a href="#" className="scrollup" id="scroll-up">
      <i className="ri-arrow-up-line"></i>
    </a>
  );
}

export default ScrollUp;
