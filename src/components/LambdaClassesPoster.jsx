import LambdaClassesPoster from "../images/lambda-classes-poster.png";
import ProjectTrackPoster from "../images/project-track-poster.jpg";
import LambdaClassesProjectPoster from "../images/lambda-classes-projects-poster.png";
import AdContainer from "./AdContainer.jsx";

export default function LambdaClassesPosterAd(props) {
    const onClickthrough = () => {
        if (window.posthog) {
            posthog.capture("lc clickthrough");
        }
    };

    return (
        <AdContainer isHidden={props.isHidden}>
            <a href="https://www.lambda-classes.com/#apply" target="_blank" onClick={onClickthrough}>
                <img src={LambdaClassesProjectPoster.src} alt="" />
            </a>
        </AdContainer>
    );
}
