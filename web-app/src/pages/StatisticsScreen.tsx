import React from "react";
import { useParams } from "react-router-dom";

const StatisticsScreen: React.FC = () => {
  const { reKey } = useParams();
  return <h1>Statistics Screen for reKey: {reKey}</h1>;
};

export default StatisticsScreen;
