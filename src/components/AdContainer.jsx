import { createSignal, onMount } from "solid-js";
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
        <div>
            {tier() === "PLUS" || tier() === "LOADING" ? null : (
                <div class={`mt-auto relative ${props.isHidden ? "hidden" : ""}`}>
                    {props.children}
                    <div
                        title="Upgrade"
                        class="absolute top-[-10px] right-[-5px] border border-inactive-border hover:border-active-border bg-secondary-background hover:bg-main-background text-secondary-foreground hover:text-active-foreground px-2 py-0 rounded-full cursor-pointer"
                        onClick={openPlusDialog}
                    >
                        &times;
                    </div>
                </div>
            )}
        </div>
    );
}
