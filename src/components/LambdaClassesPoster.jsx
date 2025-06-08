import LambdaClassesPoster from "../images/lambda-classes-poster.png";
import ProjectTrackPoster from "../images/project-track-poster.jpg";
import { createEffect, createSignal, onMount } from "solid-js";

export default function lambdaClassesPoster(props) {
    let lambdaClassesPoster = null;
    let [isHidden, setIsHidden] = createSignal(true);

    const hidePoster = () => {
        localStorage.setItem("lambda-classes-poster-hide", "true");
        setIsHidden(true);
        if (window.posthog) {
            posthog.capture("lc dismissed");
        }
    };

    const onClickthrough = () => {
        localStorage.setItem("lambda-classes-poster-hide", "true");
        setIsHidden(true);
        if (window.posthog) {
            posthog.capture("lc clickthrough");
        }
    };

    onMount(() => {
        const value = localStorage.getItem("lambda-classes-poster-hide");
        if (!value || value === "false") {
            console.log("Showing poster");
            setIsHidden(false);
        }
    });

    createEffect(() => {
        const value = localStorage.getItem("lambda-classes-poster-hide");
        if (props.isHidden || value === "true") {
            console.log("Hiding Poster");
            setIsHidden(true);
        } else {
            setIsHidden(false);
        }
    });

    return (
        <div class={`mt-auto relative ${isHidden() ? "hidden" : ""}`} ref={(el) => (lambdaClassesPoster = el)}>
            <a href="https://www.lambda-classes.com" target="_blank" onClick={onClickthrough}>
                <img src={Math.random() < 0.5 ? LambdaClassesPoster.src : ProjectTrackPoster.src} alt="" />
            </a>
            <div
                title="Hide"
                class="absolute top-[-10px] right-[-5px] border border-inactive-border hover:border-active-border bg-secondary-background hover:bg-main-background text-secondary-foreground hover:text-active-foreground px-2 py-0 rounded-full cursor-pointer"
                onClick={hidePoster}
            >
                &times;
            </div>
        </div>
    );
}
