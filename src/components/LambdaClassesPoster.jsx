import LambdaClassesPoster from "../images/lambda-classes-poster.png";
import ProjectTrackPoster from "../images/project-track-poster.jpg";
import AdContainer from "./AdContainer.jsx";

export default function LambdaClassesPosterAd(props) {
    const onClickthrough = () => {
        if (window.posthog) {
            posthog.capture("lc clickthrough");
        }
    };

    return (
        <AdContainer isHidden={props.isHidden}>
            {Math.random() < 0.5 ? (
                <a href="https://www.lambda-classes.com/abc-course" target="_blank" onClick={onClickthrough}>
                    <img src={LambdaClassesPoster.src} alt="" />
                </a>
            ) : (
                <a href="https://www.lambda-classes.com/projects" target="_blank" onClick={onClickthrough}>
                    <img src={ProjectTrackPoster.src} alt="" />
                </a>
            )}
        </AdContainer>
    );
}
