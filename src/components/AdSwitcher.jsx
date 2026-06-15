import AdSenseAd from "./AdSenseAd.jsx";

export default function AdSwitcher(props) {
    return <AdSenseAd isHidden={props.isHidden} />;
}
