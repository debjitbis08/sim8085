import { createSignal, onMount, createEffect } from "solid-js";
import { supabase, getUser } from "../lib/supabase.js";

export default function AdContainer(props) {
    const [visible, setVisible] = createSignal(false);
    const [tier, setTier] = createSignal("FREE");

    async function checkTier() {
        if (!supabase) {
            setVisible(!props.isHidden);
            return;
        }

        const { user, error } = await getUser();
        if (error && error.name === "AuthSessionMissingError") {
            setVisible(!props.isHidden);
            return;
        }

        if (error || !user) {
            setVisible(!props.isHidden);
            return;
        }

        const { data, error: tierError } = await supabase
            .from("customers")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();

        if (!tierError && data?.subscription_tier) {
            setTier(data.subscription_tier);
        }
    }

    onMount(checkTier);

    createEffect(() => {
        if (tier() !== "PLUS" && !props.isHidden) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    });

    const openPlusDialog = () => {
        window.dispatchEvent(
            new CustomEvent("showPlusDialog", {
                detail: {},
            }),
        );
    };

    return (
        <div class={`mt-auto relative ${visible() ? "" : "hidden"}`}>
            {props.children}
            <div
                title="Upgrade"
                class="hidden absolute top-[-10px] right-[-5px] border border-inactive-border hover:border-active-border bg-secondary-background hover:bg-main-background text-secondary-foreground hover:text-active-foreground px-2 py-0 rounded-full cursor-pointer"
                onClick={openPlusDialog}
            >
                &times;
            </div>
        </div>
    );
}
