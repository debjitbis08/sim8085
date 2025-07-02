import { createSignal, onMount, Show } from "solid-js";
import { supabase, getUser } from "../lib/supabase.js";

export default function AdContainer(props) {
    const [tier, setTier] = createSignal("LOADING");

    async function checkTier() {
        if (!supabase) {
            setTier("FREE");
            return;
        }

        const { user, error } = await getUser();
        if (error && error.name === "AuthSessionMissingError") {
            setTier("FREE");
            return;
        }

        if (error || !user) {
            setTier("FREE");
            return;
        }

        const { data, error: tierError } = await supabase
            .from("customers")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();

        if (!tierError && data?.subscription_tier) {
            setTier(data.subscription_tier);
        } else {
            setTier("FREE");
        }
    }

    onMount(checkTier);

    const openPlusDialog = () => {
        window.dispatchEvent(
            new CustomEvent("showPlusDialog", {
                detail: { reason: "ads" },
            }),
        );
    };

    return (
        <Show when={tier() === "FREE"}>
            <div class={`mt-auto relative ${props.isHidden ? "hidden" : ""} grow flex flex-col justify-end pt-5`}>
                <div
                    class="text-[0.8rem] self-center text-inactive-foreground hover:text-active-foreground hover:underline cursor-pointer"
                    onClick={openPlusDialog}
                >
                    Hide Ad
                </div>
                {props.children}
            </div>
        </Show>
    );
}
