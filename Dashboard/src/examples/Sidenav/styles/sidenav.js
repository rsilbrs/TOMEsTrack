/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// Material Dashboard 2 React helper functions
import pxToRem from "assets/theme/functions/pxToRem";

export default function sidenav(theme, ownerState) {
  const { palette, transitions, breakpoints, typography } = theme;
  const { miniSidenav, transparentSidenav } = ownerState;

  return {
    "& .sidenav-brand": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontSize: "1.5rem", // Aumenta o tamanho da fonte
      padding: "1rem", // Adiciona padding
      "& .MuiTypography-root": {
        fontSize: "1.75rem !important", // Força um tamanho maior
        fontWeight: "700 !important", // Deixa a fonte mais bold
        letterSpacing: "0.5px", // Melhora o espaçamento entre letras
        textTransform: "uppercase", // Opcional: deixa em maiúsculas
        background: `linear-gradient(45deg, ${palette.primary.main}, ${palette.info.main})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginTop: "0.5rem",
        marginBottom: "0.5rem",
      },
    },
    ml: 0.5,
    fontWeight: typography.fontWeightMedium,
    wordSpacing: pxToRem(-1),
    transition: transitions.create("opacity", {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    [breakpoints.up("xl")]: {
      opacity: miniSidenav ? 0 : 1,
    },
  };
}
