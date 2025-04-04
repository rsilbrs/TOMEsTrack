import React from "react";
import PropTypes from "prop-types";
import { ButtonGroup, Button } from "@mui/material";
import MDBox from "components/MDBox";

function DateRangeSelector({ selectedDays, onChange }) {
  const options = [
    { value: 30, label: "30 dias" },
    { value: 60, label: "60 dias" },
    { value: 90, label: "90 dias" },
  ];

  return (
    <MDBox display="flex" justifyContent="flex-end" mb={1}>
      <ButtonGroup size="small" aria-label="período de análise">
        {options.map((option) => (
          <Button
            key={option.value}
            onClick={() => onChange(option.value)}
            variant={selectedDays === option.value ? "contained" : "outlined"}
            color="info"
          >
            {option.label}
          </Button>
        ))}
      </ButtonGroup>
    </MDBox>
  );
}

DateRangeSelector.propTypes = {
  selectedDays: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DateRangeSelector;
