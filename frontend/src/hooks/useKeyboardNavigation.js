import { useEffect } from "react";

export default function useKeyboardNavigation() {

  useEffect(() => {

    const handleKey = (e) => {

      if (e.altKey && e.key === "m") {
        const main = document.getElementById("mainContent");
        main?.focus();
      }

      if (e.altKey && e.key === "t") {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }

      if (e.key === "Escape") {
        const menu = document.querySelector(".a11yPopover");
        if (menu) {
          menu.style.display = "none";
        }
      }

    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };

  }, []);

}