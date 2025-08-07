import React from "react";
import { useParams } from "react-router-dom";

const DetailsScreen: React.FC = () => {
  const { reKey } = useParams();
  return <h1>Details Screen for reKey: {reKey}</h1>;
};

export default DetailsScreen;
