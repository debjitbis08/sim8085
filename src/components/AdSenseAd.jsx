import { onMount } from "solid-js";
import AdContainer from "./AdContainer.jsx";

export default function AdSenseAd(props) {
    onMount(() => {
        if (
            !document.querySelector(
                'script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5403915171352852"]',
            )
        ) {
            const s = document.createElement("script");
            s.async = true;
            s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5403915171352852";
            s.crossOrigin = "anonymous";
            document.head.appendChild(s);
        }
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {}
    });

    return (
        <AdContainer isHidden={props.isHidden}>
            <ins
                class="adsbygoogle"
                style="display:block"
                data-ad-client="ca-pub-5403915171352852"
                data-ad-slot="1459633275"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </AdContainer>
    );
}
