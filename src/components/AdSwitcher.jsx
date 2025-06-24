import LambdaClassesPoster from "./LambdaClassesPoster.jsx";
import AdSenseAd from "./AdSenseAd.jsx";
import { isFeatureEnabled } from "../lib/features.js";

export default function AdSwitcher(props) {
    const showPoster = false; // isFeatureEnabled("adsense") ? Math.random() < 0.5 : true;
    return showPoster ? <LambdaClassesPoster isHidden={props.isHidden} /> : <AdSenseAd isHidden={props.isHidden} />;
}
