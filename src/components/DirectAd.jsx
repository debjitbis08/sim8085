import AdContainer from "./AdContainer.jsx";

export default function DirectAd(props) {
    const ad = props.ad;

    const onClickthrough = () => {
        if (!ad) return;
        if (typeof ad.onClick === "function") {
            ad.onClick();
        }
        if (ad.trackingEvent && window.posthog) {
            posthog.capture(ad.trackingEvent, ad.trackingProps || {});
        }
    };

    if (!ad) return null;

    const imageSrc = typeof ad.image === "string" ? ad.image : ad.image?.src;

    return (
        <AdContainer isHidden={props.isHidden}>
            <a href={ad.href} target={ad.target || "_blank"} rel={ad.rel || "noreferrer"} onClick={onClickthrough}>
                <img src={imageSrc} alt={ad.alt || ""} />
            </a>
        </AdContainer>
    );
}
