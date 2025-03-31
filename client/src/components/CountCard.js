import React from "react";
import CountUp from "../blocks/TextAnimations/CountUp/CountUp";

const CountCard = ({ name, count }) => {
  return (
    <div style={styles.card}>
      <h2>
        <CountUp
          to={count}
          from={0}
          duration={2}
          direction="up"
          className="count-up"
          separator=","
          startWhen={true}
          delay={0}
        ></CountUp>
      </h2>
      <p>{name}</p>
    </div>
  );
};

const styles = {
  card: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px",
    // boxShadow: "2px 2px 5px rgba(0, 0, 0, 0.1)",
    width: "100%",
  },
};

export default CountCard;
