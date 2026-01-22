import { Outlet } from "react-router-dom";
import { RadarLayout } from "@/components/radar/RadarLayout";

const RadarSaude = () => {
  return (
    <RadarLayout>
      <Outlet />
    </RadarLayout>
  );
};

export default RadarSaude;
