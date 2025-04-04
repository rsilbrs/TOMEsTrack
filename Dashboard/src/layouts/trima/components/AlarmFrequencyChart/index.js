import React, { useState } from "react";
import PropTypes from "prop-types";
import { Card } from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import VerticalBarChart from "examples/Charts/BarCharts/VerticalBarChart";
import DateRangeSelector from "../DateRangeSelector";
import useAlarmFrequencyData from "../data/alarmFrequency";

function AlarmFrequencyChart({ icon, title, description, height }) {
  const [selectedDays, setSelectedDays] = useState(60);
  const alarmData = useAlarmFrequencyData(selectedDays);

  const handlePeriodChange = (days) => {
    setSelectedDays(days);
  };

  return (
    <Card>
      <MDBox p={3} pt={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center">
            {icon.component && (
              <MDBox
                width="4rem"
                height="4rem"
                bgColor={icon.color || "dark"}
                variant="gradient"
                coloredShadow={icon.color || "dark"}
                borderRadius="xl"
                display="flex"
                justifyContent="center"
                alignItems="center"
                color="white"
                mr={2}
              >
                <Icon fontSize="medium">{icon.component}</Icon>
              </MDBox>
            )}
            <MDBox>
              {title && <MDTypography variant="h6">{title}</MDTypography>}
              {description && (
                <MDTypography component="div" variant="button" color="text">
                  {description} ({selectedDays} dias)
                </MDTypography>
              )}
            </MDBox>
          </MDBox>
          <DateRangeSelector selectedDays={selectedDays} onChange={handlePeriodChange} />
        </MDBox>
        <MDBox height={height}>
          <VerticalBarChart chart={alarmData} height={height} />
        </MDBox>
      </MDBox>
    </Card>
  );
}

AlarmFrequencyChart.defaultProps = {
  icon: { color: "error", component: "warning" },
  title: "Top 10 Alarmes",
  description: "Frequência nos últimos",
  height: "15rem",
};

AlarmFrequencyChart.propTypes = {
  icon: PropTypes.shape({
    color: PropTypes.oneOf([
      "primary",
      "secondary",
      "info",
      "success",
      "warning",
      "error",
      "light",
      "dark",
    ]),
    component: PropTypes.node,
  }),
  title: PropTypes.string,
  description: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default AlarmFrequencyChart;
