export function withDefaultClass(Component, defaultClass) {
    return (props) => <Component {...props} class={`${defaultClass} ${props.class ?? ""}`} />;
}
