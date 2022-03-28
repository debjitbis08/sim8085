port module Main exposing (..)

import Array exposing (..)
import Browser
import Bitwise exposing (..)
import Char exposing (..)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Json.Decode as Json
import List
import String exposing (..)
import FontAwesome.Attributes as Icon
import FontAwesome.Brands as Icon
import FontAwesome.Icon as Icon exposing (Icon)
import FontAwesome.Layering as Icon
import FontAwesome.Solid as Icon
import FontAwesome.Styles as Icon
import InfiniteList
import Hex


type ProgramState
    = Idle
    | Loaded
    | Running
    | Paused


type alias Config =
    { initialCode : Maybe String
    }



-- APP


main : Program Config Model Msg
main =
    Browser.element { init = init, view = view, update = update, subscriptions = subscriptions }

-- MODEL


type alias Model =
    { code : String
    , error : Maybe AssemblerError
    , assembled : Array AssembledCode
    , breakpoints : List Int
    , loadAddr : Int
    , programState : ProgramState
    , accumulator : Int
    , registers : Register
    , stackPtr : Int
    , programCounter : Int
    , editingAccumulator : Bool
    , memory : Array Int
    , editingMemoryCell : Maybe Int
    , infiniteList : InfiniteList.Model
    , memoryStart : Int
    , memoryStartLarge : Int
    , memoryStartSmall : Int
    , flags : Flags
    , activeFile : String
    , openFiles : List File
    }


init : Config -> ( Model, Cmd Msg )
init config =
    ( { code = Maybe.withDefault initialCode config.initialCode
      , error = Nothing
      , assembled = Array.empty
      , breakpoints = []
      , loadAddr = 2048
      , programState = Idle
      , accumulator = 0
      , registers = initialRegisters
      , stackPtr = 0
      , programCounter = 0
      , editingAccumulator = False
      , memory = Array.repeat 65536 0
      , editingMemoryCell = Nothing
      , infiniteList = InfiniteList.init
      , memoryStart = 0
      , memoryStartLarge = 0
      , memoryStartSmall = 0
      , flags = initialFlags
      , activeFile = "main.asm"
      , openFiles = [ File "main.asm" "" ]
      }
    , Cmd.none
    )


initialCode : String
initialCode =
    """;<Program title>

jmp start

;data

;code
start: nop


hlt"""


type alias RegisterField =
    { high : Int, low : Int, editing : Bool }


type alias Register =
    { bc : RegisterField
    , de : RegisterField
    , hl : RegisterField
    }


type alias Flags =
    { s : Bool
    , z : Bool
    , ac : Bool
    , p : Bool
    , c : Bool
    }


type alias File =
    { name : String
    , code : String
    }


initialRegisters : Register
initialRegisters =
    { bc = { high = 0, low = 0, editing = False }
    , de = { high = 0, low = 0, editing = False }
    , hl = { high = 0, low = 0, editing = False }
    }


initialFlags : Flags
initialFlags =
    { s = False
    , z = False
    , ac = False
    , p = False
    , c = False
    }



-- UPDATE


type Msg
    = NoOp
    | Run
    | RunOne
    | Load
    | Stop
    | Reset
    | ResetRegisters
    | ResetFlags
    | ResetMemory
    | LoadSucceded { memory : Array Int, assembled : Array AssembledCode }
    | LoadFailed AssemblerError
    | RunSucceded ExternalState
    | UpdateRunError Int
    | RunOneSucceded { status : Int, state : ExternalState }
    | RunOneFinished { status : Int, state : Maybe ExternalState }
    | UpdateCode String
    | PreviousMemoryPage
    | NextMemoryPage
    | ChangeMemoryStart String
    | ChangeMemoryStartSmall String
    | JumpToAddress String
    | UpdateBreakpoints BreakPointAction
    | EditRegister String
    | SaveRegister String String
    | StopEditRegister String
    | RollbackEditRegister String
    | UpdateFlag String Bool
    | EditMemoryCell Int
    | UpdateMemoryCell String
    | UpdateLoadAddr String
    | InfiniteListMsg InfiniteList.Model


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Run ->
            if List.isEmpty model.breakpoints then
                ( model
                , run
                    { state = createExternalStateFromModel model
                    , programState = getProgramState model.programState
                    , loadAt = model.loadAddr
                    }
                )

            else
                let
                    nextBreak =
                        findPCToPause model
                in
                case nextBreak of
                    Nothing ->
                        ( model
                        , runTill
                            { state = createExternalStateFromModel model
                            , pauseAt = 65535
                            , programState = getProgramState model.programState
                            , loadAt = model.loadAddr
                            }
                        )

                    Just n ->
                        if model.programState == Loaded then
                            ( model
                            , runTill
                                { state =
                                    let
                                        s =
                                            createExternalStateFromModel model
                                    in
                                    { s | pc = model.loadAddr }
                                , pauseAt = n
                                , programState = getProgramState model.programState
                                , loadAt = model.loadAddr
                                }
                            )

                        else
                            ( model
                            , runTill
                                { state = createExternalStateFromModel model
                                , pauseAt = n
                                , programState = getProgramState model.programState
                                , loadAt = model.loadAddr
                                }
                            )

        RunOne ->
            if model.programState == Loaded then
                ( { model | programState = Paused, programCounter = model.loadAddr }
                , debug
                    { state =
                        let
                            s =
                                createExternalStateFromModel model
                        in
                        { s | pc = model.loadAddr }
                    , nextLine =
                        case findLineAtPC model.loadAddr model.programCounter model.assembled model.memory of
                            Nothing ->
                                model.programCounter - model.loadAddr

                            Just l ->
                                l
                    , programState = getProgramState model.programState
                    }
                )

            else
                ( { model | programState = Running }
                , runOne { state = createExternalStateFromModel model, offset = model.loadAddr }
                )

        Load ->
            ( model, load { offset = model.loadAddr, code = model.code, loadAddr = model.loadAddr } )

        RunOneSucceded res ->
            let
                updatedM =
                    updateModelFromExternalState model res.state

                cmd =
                    nextLine
                        (case findLineAtPC model.loadAddr res.state.pc model.assembled model.memory of
                            Nothing ->
                                model.programCounter - model.loadAddr

                            -- Bad fallback
                            Just l ->
                                l
                        )
            in
            ( { updatedM | programState = Paused }, cmd )

        RunOneFinished res ->
            case res.state of
                Nothing ->
                    ( { model | programState = Idle }, Cmd.none )

                Just s ->
                    let
                        updatedM =
                            updateModelFromExternalState model s
                    in
                    ( { updatedM | programState = Idle }, Cmd.none )

        UpdateMemoryCell value ->
            let
                updatedMemory =
                    case model.editingMemoryCell of
                        Nothing ->
                            model.memory

                        Just addr ->
                            Array.set addr (strToHex value) model.memory

                updatedModel =
                    { model | memory = updatedMemory, editingMemoryCell = Nothing }
            in
            ( updatedModel
            , updateState { state = createExternalStateFromModel updatedModel }
            )

        Stop ->
            ( { model | programState = Idle }, editorDisabled False )

        JumpToAddress v ->
            let
                n =
                    Result.withDefault 0 (Hex.fromString <| Debug.log "hex" v)

                row = Debug.log "row" (n // 16)
            in
                ( model
                , InfiniteList.scrollToNthItem
                    { postScrollMessage = NoOp
                    , listHtmlId = "memory-view-infinite-list"
                    , itemIndex = row
                    , configValue = memoryListConfig model
                    , items = arrayChunk 16 model.memory
                    }
                )


        _ ->
            ( updateHelper msg model, Cmd.none )


updateHelper : Msg -> Model -> Model
updateHelper msg model =
    case msg of
        NoOp ->
            model

        UpdateCode newCode ->
            { model | code = newCode }

        PreviousMemoryPage ->
            { model
                | memoryStart =
                    if model.memoryStart == 0 then
                        0

                    else
                        model.memoryStart - 256
            }

        NextMemoryPage ->
            { model
                | memoryStart =
                    if model.memoryStart == 65536 - 128 then
                        model.memoryStart

                    else
                        model.memoryStart + 256
            }

        ChangeMemoryStart v ->
            let
                n =
                    Maybe.withDefault 0 (String.toInt v)
            in
            { model
                | memoryStartLarge = n
                , memoryStart = n + model.memoryStartSmall
            }

        ChangeMemoryStartSmall v ->
            let
                n =
                    Maybe.withDefault 0 (String.toInt v)
            in
            { model
                | memoryStartSmall = n
                , memoryStart = n + model.memoryStartLarge
            }

        LoadFailed e ->
            { model | error = Just e, assembled = Array.empty }

        LoadSucceded res ->
            { model
                | memory = res.memory
                , assembled = addBreakpointsToAssembled model.breakpoints res.assembled
                , programCounter = model.loadAddr
                , error = Nothing
                , programState = Loaded
            }

        RunSucceded state ->
            let
                updatedM =
                    updateModelFromExternalState model state
            in
            { updatedM | programState = Idle }

        UpdateRunError errorState ->
            model

        -- TODO: Unimplemented
        UpdateBreakpoints ba ->
            let
                updatedBreakpoints =
                    if ba.action == "add" then
                        ba.line + 1 :: model.breakpoints

                    else
                        List.filter (\b -> b /= (ba.line + 1)) model.breakpoints
            in
            { model
                | breakpoints = updatedBreakpoints
                , assembled = addBreakpointsToAssembled updatedBreakpoints model.assembled
            }

        EditRegister name ->
            if name == "a" then
                { model | editingAccumulator = True }

            else
                { model
                    | registers =
                        { bc =
                            if name == "bc" then
                                setRegisterEdit model.registers.bc True

                            else
                                model.registers.bc
                        , de =
                            if name == "de" then
                                setRegisterEdit model.registers.de True

                            else
                                model.registers.de
                        , hl =
                            if name == "hl" then
                                setRegisterEdit model.registers.hl True

                            else
                                model.registers.hl
                        }
                }

        StopEditRegister name ->
            if name == "a" then
                { model | editingAccumulator = False }

            else
                { model
                    | registers =
                        { bc =
                            if name == "bc" then
                                setRegisterEdit model.registers.bc False

                            else
                                model.registers.bc
                        , de =
                            if name == "de" then
                                setRegisterEdit model.registers.de False

                            else
                                model.registers.de
                        , hl =
                            if name == "hl" then
                                setRegisterEdit model.registers.hl False

                            else
                                model.registers.hl
                        }
                }

        SaveRegister name value ->
            if name == "a" then
                { model | accumulator = strToHex value }

            else
                { model
                    | registers =
                        { bc =
                            if name == "bc" then
                                saveRegisterEdit model.registers.bc value

                            else
                                model.registers.bc
                        , de =
                            if name == "de" then
                                saveRegisterEdit model.registers.de value

                            else
                                model.registers.de
                        , hl =
                            if name == "hl" then
                                saveRegisterEdit model.registers.hl value

                            else
                                model.registers.hl
                        }
                }

        RollbackEditRegister name ->
            model

        UpdateFlag flag value ->
            { model
                | flags =
                    { z =
                        if flag == "Z" then
                            value

                        else
                            model.flags.z
                    , s =
                        if flag == "S" then
                            value

                        else
                            model.flags.s
                    , p =
                        if flag == "P" then
                            value

                        else
                            model.flags.p
                    , c =
                        if flag == "C" then
                            value

                        else
                            model.flags.c
                    , ac =
                        if flag == "AC" then
                            value

                        else
                            model.flags.ac
                    }
            }

        Reset ->
            { model
                | registers = initialRegisters
                , flags = initialFlags
                , memory = Array.repeat 65536 0
                , accumulator = 0
                , stackPtr = 0
                , programCounter = 0
            }

        ResetRegisters ->
            { model
                | registers = initialRegisters
                , accumulator = 0
                , stackPtr = 0
                , programCounter = 0
            }

        ResetFlags ->
            { model | flags = initialFlags }

        ResetMemory ->
            { model | memory = Array.repeat 65536 0 }

        EditMemoryCell addr ->
            { model | editingMemoryCell = Just addr }

        UpdateMemoryCell value ->
            { model
                | memory =
                    case model.editingMemoryCell of
                        Nothing ->
                            model.memory

                        Just addr ->
                            Array.set addr (strToHex value) model.memory
                , editingMemoryCell = Nothing
            }

        UpdateLoadAddr value ->
            { model
                | loadAddr = strToHex value
            }

        InfiniteListMsg infiniteList ->
            { model | infiniteList = infiniteList }

        _ ->
            model


findPCToPause model =
    let
        assembled =
            Array.toIndexedList model.assembled

        remaining =
            List.drop (model.programCounter - model.loadAddr + 1) assembled

        nextBreak =
            List.head (List.filter (\( _, a ) -> a.kind == "code" && a.breakHere) remaining)
    in
    case nextBreak of
        Nothing ->
            Nothing

        Just ( l, _ ) ->
            Just (l + model.loadAddr - 1)


addBreakpointsToAssembled updatedBreakpoints assembled =
    Array.map
        (\a ->
            if List.member a.location.start.line updatedBreakpoints then
                { a | breakHere = True }

            else
                a
        )
        assembled


updateModelFromExternalState model state =
    { model
        | accumulator = state.a
        , registers = readRegistersFromExternalState model.registers state
        , flags = readFlagsFromExternalState state
        , stackPtr = state.sp
        , programCounter = state.pc
        , memory = state.memory
    }


updateOnLoaded : String -> b -> b -> b
updateOnLoaded programState n o =
    if programState == "Loaded" then
        o

    else
        n


loadCode memory inputCode loadAddr =
    let
        codeLength =
            Array.length inputCode

        startOfMemory =
            Array.toList (Array.slice 0 loadAddr memory)

        opcodes =
            Array.toList (Array.map .data inputCode)

        restOfMemory =
            Array.toList (Array.slice (loadAddr + codeLength) 65536 memory)
    in
    Array.fromList (List.append (List.append startOfMemory opcodes) restOfMemory)


setRegisterEdit : { a | high : b, low : c } -> d -> { high : b, low : c, editing : d }
setRegisterEdit register isEditing =
    { high = register.high, low = register.low, editing = isEditing }


saveRegisterEdit : { a | editing : b } -> String -> { high : Int, low : Int, editing : b }
saveRegisterEdit register value =
    let
        v =
            strToHex value
    in
    { high = (v |> shiftRightBy 8) |> and 0xFF, low = v |> and 0xFF, editing = register.editing }


strToHex : String -> Int
strToHex s =
    List.foldl (\a b -> a + b)
        0
        (List.indexedMap (\i f -> (16 ^ i) * charToHex f)
            (List.reverse (String.toList s))
        )


charToHex c =
    if Char.isDigit c then
        Char.toCode c - 48

    else if Char.isLower c then
        Char.toCode c - 97 + 10

    else
        Char.toCode c - 65 + 10


findLineAtPC : Int -> Int -> Array AssembledCode -> Array Int -> Maybe Int
findLineAtPC loadAddr pc assembled memory =
    let
        maybeOpcode =
            Array.get pc memory
    in
    case maybeOpcode of
        Nothing ->
            Nothing

        Just opcode ->
            case Array.get 0 (Array.filter (\c -> c.data == opcode) (Array.slice (pc - loadAddr) (Array.length assembled) assembled)) of
                Nothing ->
                    Nothing

                Just a ->
                    Just a.location.start.line


readRegistersFromExternalState reg state =
    { bc = { high = state.b, low = state.c, editing = reg.bc.editing }
    , de = { high = state.d, low = state.e, editing = reg.de.editing }
    , hl = { high = state.h, low = state.l, editing = reg.hl.editing }
    }


readFlagsFromExternalState state =
    { s = state.flags.s
    , z = state.flags.z
    , ac = state.flags.ac
    , p = state.flags.p
    , c = state.flags.cy
    }


createExternalStateFromModel model =
    { a = model.accumulator
    , b = model.registers.bc.high
    , c = model.registers.bc.low
    , d = model.registers.de.high
    , e = model.registers.de.low
    , h = model.registers.hl.high
    , l = model.registers.hl.low
    , sp = model.stackPtr
    , pc = model.programCounter
    , flags =
        { z = model.flags.s
        , s = model.flags.z
        , p = model.flags.p
        , cy = model.flags.c
        , ac = model.flags.ac
        }
    , memory = model.memory

    -- , programState = getProgramState model.programState
    }


getProgramState programState =
    case programState of
        Idle ->
            "Idle"

        Loaded ->
            "Loaded"

        Running ->
            "Running"

        Paused ->
            "Paused"



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ code UpdateCode
        , breakpoints UpdateBreakpoints
        , loadSuccess LoadSucceded
        , loadError LoadFailed
        , runSuccess RunSucceded
        , runError UpdateRunError
        , runOneSuccess RunOneSucceded
        , runOneFinished RunOneFinished
        ]



-- VIEW
-- Html is defined as: elem [ attribs ][ children ]
-- CSS can be applied via class names or inline style attrib


view : Model -> Html Msg
view model =
    div [ class "work-area" ]
        [ div [ class "row" ]
            [ div [ class "col-md-2 cpu-display" ]
                [ div []
                    [ div [ class "row" ]
                        [ h3 [ class "col-md-7" ] [ text "Registers" ]
                        , span
                            [ class "col-md-1 text-danger"
                            , style "margin" "25px 0 10px"
                            , style "cursor" "pointer"
                            , onClick ResetRegisters
                            ]
                            [ Icon.viewIcon Icon.trash ]
                        ]
                    , table [ class "table table-striped registers-view" ]
                        [ tbody [] (showRegisters model.accumulator model.flags model.registers model.stackPtr model.programCounter model.editingAccumulator)
                        ]
                    ]
                , div []
                    [ div [ class "row" ]
                        [ h3 [ class "col-md-4" ] [ text "Flags" ]
                        , span
                            [ class "col-md-1 text-danger"
                            , style "margin" "25px 0 10px"
                            , style "cursor" "pointer"
                            , onClick ResetFlags
                            ]
                            [ Icon.viewIcon Icon.trash ]
                        ]
                    , table [ class "table table-striped flags-view" ] [ tbody [] (showFlags model.flags) ]
                    ]
                ]
            , div [ class "col coding-area" ]
                [ div [ class "coding-area__toolbar row" ]
                    [ div [ class "coding-area__load-addr pull-right col-md-12" ]
                        [ div [ class "form-group form-inline pull-right" ]
                            [ label [ class "mx-2" ] [ text "Load at" ]
                            , span [ class "input-group" ]
                                [ span [ class "input-group-addon" ] [ text "0x" ]
                                , input
                                    [ class "coding-area__load-addr-input form-control"
                                    , onChange UpdateLoadAddr
                                    , value (toWord <| model.loadAddr)
                                    , title "Press tab to update"
                                    , style "width" "6rem"
                                    ]
                                    []
                                ]
                            ]
                        ]
                    ]
                , div [ ]
                    [ div [ class "row" ]
                        [ div [ class "col-sm-1" ]
                            [ toolbarButton (model.programState /= Idle) "primary" Load "Assemble and Load Program" Icon.cog "btn-load"
                            , toolbarButton (model.programState /= Loaded && model.programState /= Paused) "primary" Run "Run Program" Icon.fastForward "btn-run"
                            , toolbarButton (model.programState /= Loaded && model.programState /= Paused)
                                "primary"
                                RunOne
                                "Run one instruction"
                                Icon.stepForward
                                "btn-step"
                            , toolbarButton (model.programState == Idle) "warning" Stop "Stop program and return to editing" Icon.stop "btn-stop"
                            , toolbarButton (model.programState /= Idle) "danger" Reset "Reset Everything" Icon.trash "btn-refresh-everything"
                            ]
                        , div [ class "col" ]
                            [ div [ class "coding-area__editor-container" ]
                                [ -- ul [ class "nav nav-tabs" ] (List.map (showOpenFileTabs model.activeFile) model.openFiles)
                                textarea [ id "coding-area__editor", value model.code ] []
                                ]
                            ]
                        ]
                    ]
                ]
            , div [ class "col-auto" ]
                -- [ div [ class "" ] [ showMemory model model.memory model.memoryStart model.memoryStartSmall ]
                [ showMemory2 model model.memory
                ]
            ]
        , div [ class "row", hidden (model.programState == Idle) ]
            [ div [ class "col-md-7" ]
                [ div [ class "panel panel-default" ]
                    [ div [ class "panel-heading" ] [ h3 [ class "panel-title" ] [ text "Assembler Output" ] ]
                    , div [ class "panel-body assembled-code-area" ]
                        [ case model.error of
                            Nothing ->
                                showAssembled model.assembled model.code

                            Just error ->
                                showAssemblerError error
                        ]
                    ]
                ]
            ]
        ]



-- <img src=


toolbarButton isDisabled type_ msg tooltip icon automationId =
    button
        [ class ("btn btn-squared btn-outline-" ++ type_)
        , onClick msg
        , title tooltip
        , disabled isDisabled
        , attribute "data-toggle" "tooltip"
        , attribute "data-placement" "top"
        , attribute "data-automation-id" automationId ]
        [ Icon.viewIcon icon
        ]


tabAddButton =
    li [ class "" ]
        [ button [ class "btn" ] [ span [ class "glyphicon glyphicon-plus" ] [] ]
        ]


showAssemblerError error =
    text ("Line " ++ String.fromInt error.line ++ ", Column " ++ String.fromInt error.column ++ ": " ++ error.msg)


zipAssembledSource assembled source =
    let
        sourceLines =
            Array.fromList (String.split "\n" source)

        findAssembled ln =
            Array.map (\a -> { data = a.data, kind = a.kind }) (Array.filter (\c -> (c.location.start.line - 1) == ln) assembled)
    in
    Array.indexedMap (\i s -> ( findAssembled i, s )) sourceLines


showAssembled assembled source =
    let
        ls =
            zipAssembledSource assembled source

        showSingleLine n l =
            let
                codeStr =
                    showCode (Tuple.first l)
            in
            tr []
                [ td [ class "assembled-code-listing__lineno-cell" ] [ text <| String.fromInt <| (n + 1) ]
                , td [ class "assembled-code-listing__opcode-cell" ]
                    [ text
                        (if codeStr == "0  " then
                            ""

                         else
                            codeStr
                        )
                    ]
                , td [ class "assembled-code-listing__source-cell" ] [ text (Tuple.second l) ]
                ]
    in
    table [ class "table assembled-code-listing" ] [ tbody [] (Array.toList (Array.indexedMap showSingleLine ls)) ]


showCode codes =
  let
    opcode = Array.map (.data) (Array.filter (\c -> c.kind == "code") codes)
    addr = Array.map (.data) (Array.filter (\c -> c.kind == "addr") codes)
    data = Array.map (.data) (Array.filter (\c -> c.kind == "data") codes)
    absoluteAddrNum = if Array.length addr == 2 then ((shiftLeftBy 8 (Maybe.withDefault 0 <| Array.get 1 addr)) + (shiftLeftBy 8 8)) + (Maybe.withDefault 0 <| Array.get 0 addr) else 0
    absoluteAddr = Array.fromList [and absoluteAddrNum 0xFF, shiftRightBy 8 absoluteAddrNum]
    blankIfZero s = if s == "00" then "" else s
  in
    (blankIfZero <| String.toUpper <| toByte <| (Maybe.withDefault 0 (Array.get 0 opcode))) ++ "  " ++
      (Array.foldr (\a b -> (toByte a) ++ " " ++ b) "" (if Array.length addr == 2 then absoluteAddr else data))

onChange : (String -> msg) -> Attribute msg
onChange tagger =
    on "change" (Json.map tagger targetValue)


onKeyUp : (Int -> msg) -> Attribute msg
onKeyUp tagger =
    on "keyup" (Json.map tagger keyCode)


showRegisterNonEditable name rid { high, low, editing } =
    tr [ class "reg-display__row" ]
        [ th [ scope "row" ] [ text name ]
        , td []
            [ span []
                [ span [ style "padding-right" "3px", style "color" "#AAA" ] [ text "0x" ]
                , span [ style "padding-right" "3px" ] [ text <| String.toUpper <| toByte high ]
                , span [] [ text <| String.toUpper <| toByte low ]
                ]
            ]
        ]


showRegister name rid { high, low, editing } =
    tr [ class "reg-display__row" ]
        [ th [ scope "row" ] [ text name ]
        , td [ hidden editing ]
            [ span [ onDoubleClick (EditRegister rid), title "Double click to edit", attribute "data-automation-id" ("val-reg-" ++ rid) ]
                [ span [ style "padding-right" "3px", style "color" "#AAA" ] [ text "0x" ]
                , span [ style "padding-right" "3px" ] [ text <| String.toUpper <| toByte high ]
                , span [] [ text <| String.toUpper <| toByte low ]
                ]
            , span
                [ class "reg-display__edit-icon"
                , title "Click to edit"
                , onClick (EditRegister rid)
                ]
                [ Icon.viewIcon Icon.edit ]
            ]
        , td [ onDoubleClick (EditRegister rid), hidden (not editing) ]
            [ span [ style "padding-right" "3px" ] [ text "0x" ]
            , input
                [ class "reg-display__reg-input"
                , onChange (SaveRegister rid)
                , onBlur (StopEditRegister rid)

                -- , onKeyUp (\k ->
                --            case k of
                --              10 -> StopEditRegister rid
                --              11 -> RollbackEditRegister rid)
                , value (toWord <| (high |> shiftLeftBy 8) + low)
                , title "Press tab to save"
                ]
                []
            ]
        ]


showAccumulator name rid { high, low, editing } =
    tr [ class "reg-display__row" ]
        [ th [ scope "row" ] [ text name ]
        , td [ hidden editing ]
            [ span [ onDoubleClick (EditRegister rid), title "Double click to edit" ]
                [ span [ style "padding-right" "3px", style "color" "#AAA" ] [ text "0x" ]
                , span [ style "padding-right" "3px" ] [ text <| String.toUpper <| toByte high ]
                , span [] [ text <| String.toUpper <| toByte low ]
                ]
            , span
                [ class "reg-display__edit-icon"
                , title "Click to edit"
                , onClick (EditRegister rid)
                ]
                [ Icon.viewIcon Icon.edit ]
            ]
        , td [ onDoubleClick (EditRegister rid), hidden (not editing) ]
            [ span [ style "padding-right" "3px" ] [ text "0x" ]
            , input
                [ class "reg-display__acc-input"
                , onChange (SaveRegister rid)
                , onBlur (StopEditRegister rid)
                , value (toByte <| high)
                , title "Press tab to save"
                ]
                []
            , span [] [ text <| String.toUpper <| toByte low ]
            ]
        ]


getFlagByte : Flags -> Int
getFlagByte currentFlags =
    Array.foldl (\a b -> a + b)
        0
        (Array.indexedMap
            (\i f ->
                (2 ^ i)
                    * (if f then
                        1

                       else
                        0
                      )
            )
            (Array.fromList [ currentFlags.c, True, currentFlags.p, False, currentFlags.ac, False, currentFlags.z, currentFlags.s ])
        )


showRegisters accumulator flags registers stackPtr programCounter editingAccumulator =
    [ showAccumulator "A/PSW" "a" { high = accumulator, low = getFlagByte flags, editing = editingAccumulator }
    , showRegister "BC" "bc" registers.bc
    , showRegister "DE" "de" registers.de
    , showRegister "HL" "hl" registers.hl
    , showRegisterNonEditable "SP" "sp" { high = (stackPtr |> shiftRightBy 8) |> and 0xFF, low = stackPtr |> and 0xFF, editing = False }
    , showRegisterNonEditable "PC" "pc" { high = (programCounter |> shiftRightBy 8) |> and 0xFF, low = programCounter |> and 0xFF, editing = False }
    ]


showFlag : String -> Bool -> Html Msg
showFlag name value =
    tr []
        [ th [ scope "row" ] [ text name ]
        , td []
            -- [ input [ type_ "checkbox", checked value, onCheck (UpdateFlag name), attribute "data-automation-id" ("val-flg-" ++ name) ] []
            -- ]
            [ div [ class "custom-control custom-switch" ]
                [ input
                    [ type_ "checkbox"
                    , checked value
                    , onCheck (UpdateFlag name)
                    , attribute "data-automation-id" ("val-flg-" ++ name)
                    , class "custom-control-input"
                    , id ("flag-checkbox-" ++ name)
                    ]
                    []
                , label [ class "custom-control-label", attribute "for" ("flag-checkbox-" ++ name) ] [ text "" ]
                ]
            ]
        ]


showFlags : Flags -> List (Html Msg)
showFlags flags =
    [ showFlag "Z" flags.z
    , showFlag "S" flags.s
    , showFlag "P" flags.p
    , showFlag "C" flags.c
    , showFlag "AC" flags.ac
    ]


showOpenFileTabs : String -> File -> Html msg
showOpenFileTabs activeFileName { name } =
    li
        [ class
            (if activeFileName == name then
                "active"

             else
                ""
            )
        ]
        [ a [ href "#" ] [ text name ]
        ]


memoryViewHeader =
    div [ class "row" ]
        [ h3 [ class "col-md-5" ]
            [ text "Memory View "
            , span
                [ class "text-danger small"
                , style "margin" "25px 0 10px"
                , style "cursor" "pointer"
                , onClick ResetMemory
                ]
                [ Icon.viewIcon Icon.trash ]
            ]
        , div [ class "col-md-7 pull-right" ]
            [ div [ class "input-group memory-view__jump-to-addr", style "padding" "15px 0 0 10px" ]
                [ span [ class "input-group-addon" ] [ text "0x" ]
                , input
                    [ type_ "text"
                    , class "form-control"
                    , placeholder "Jump to Address"
                    , pattern "[0-9A-Fa-f]{4}"
                    , onInput JumpToAddress
                    ]
                    []
                ]
            ]
        ]
showMemoryCellRow2 : Model -> Int -> Int -> Array Int -> Html Msg
showMemoryCellRow2 model elIdx listIdx cells =
    div [ class "memory-view__row" ]
        (( span [ class "memory-view__row-header" ] [ text <| String.toUpper <| toThreeBytes listIdx ])
        :: List.indexedMap (showMemoryCell model (listIdx * 16)) (Array.toList cells)
        )



memoryListConfig model =
    InfiniteList.config
            { itemView = showMemoryCellRow2 model
            , itemHeight = InfiniteList.withConstantHeight 26
            , containerHeight = 416
            }
            |> InfiniteList.withClass "table memory-view__cells"

showMemory2 model memory =
    div [ class "memory-view" ]
        [ memoryViewHeader
        , div
            [ class "table memory-view__cells" ]
            [ div [] (span [ class "memory-view__column-header", style "opacity" "0" ] [ text "000" ] :: List.map (\c -> span [ class "memory-view__column-header" ] [ text <| "0" ++ String.toUpper (toRadix 16 c) ]) (List.range 0 15))
            , div
                [ style "width" "100%"
                , style "height" "416px"
                , style "overflow-x" "hidden"
                , style "overflow-y" "auto"
                , style  "-webkit-overflow-scrolling" "touch"
                , InfiniteList.onScroll InfiniteListMsg
                , id "memory-view-infinite-list"
                ]
                [ InfiniteList.view (memoryListConfig model) model.infiniteList (arrayChunk 16 memory) ]
            ]
        ]

arrayChunk : Int -> Array a -> List (Array a)
arrayChunk chunkSize arr =
    List.map (\start -> Array.slice (chunkSize * start) ((start + 1) * chunkSize) arr) <| List.range 0 ((Array.length arr // chunkSize) - 1)

isEven n =
    modBy 2 n == 0


isOdd n =
    modBy 2 n /= 0


chunk : Int -> List a -> List (List a)
chunk k xs =
    let
        len =
            List.length xs
    in
    if len > k then
        List.take k xs :: chunk k (List.drop k xs)

    else
        [ xs ]


memoryCellHighlightType model addr cell =
    if addr >= model.loadAddr && addr < (model.loadAddr + Array.length model.assembled) then
        "highlight"

    else if cell > 0 then
        "has-data"

    else
        ""


showMemoryCell : Model -> Int -> Int -> Int -> Html Msg
showMemoryCell model start col cell =
    let
        addr =
            start + col
    in
    span
        [ class ("memory-view__cell memory-view__cell_" ++ memoryCellHighlightType model addr cell)
        , title (toWord addr)
        , onDoubleClick (EditMemoryCell addr)
        ]
        [ span [ class "memory-view__cell-text", hidden (addr == Maybe.withDefault -1 model.editingMemoryCell) ] [ text <| String.toUpper <| toByte <| cell ]
        , span [ hidden (addr /= Maybe.withDefault -1 model.editingMemoryCell) ]
            [ input
                [ class "memory-view__cell__input"
                , onChange UpdateMemoryCell
                , value (toByte <| cell)
                ]
                []
            ]
        ]


showMemoryCellRow : Model -> Int -> Int -> List Int -> Html Msg
showMemoryCellRow model start i cells =
    tr [] (th [ scope "row" ] [ text <| String.toUpper <| toThreeBytes ((start // 16) + i) ] :: List.indexedMap (showMemoryCell model (start + i * 16)) cells)


showMemoryCells : Model -> Int -> Array Int -> Array (Html Msg)
showMemoryCells model start cells =
    Array.indexedMap (showMemoryCellRow model start) (Array.fromList (chunk 16 (Array.toList cells)))


showScalePoint : Int -> Html msg
showScalePoint value =
    li [] [ text <| String.fromInt <| value ]


toRadix : Int -> Int -> String
toRadix r n =
    let
        getChr c =
            if c < 10 then
                String.fromInt c

            else
                String.fromChar <| Char.fromCode (87 + c)

        getStr b =
            if n < b then
                getChr n

            else
                toRadix r (n // b) ++ getChr (modBy b n)
    in
    case r >= 2 && r <= 16 of
        True ->
            getStr r

        False ->
            String.fromInt n


toWord n =
    if n < 16 then
        "000" ++ toRadix 16 n

    else if n < 256 then
        "00" ++ toRadix 16 n

    else if n < 4096 then
        "0" ++ toRadix 16 n

    else
        toRadix 16 n


toThreeBytes n =
    if n < 16 then
        "00" ++ toRadix 16 n

    else if n < 256 then
        "0" ++ toRadix 16 n

    else
        toRadix 16 n


toByte n =
    if n < 16 then
        "0" ++ toRadix 16 n

    else
        toRadix 16 n



-- Ports


type alias ExternalState =
    { a : Int
    , b : Int
    , c : Int
    , d : Int
    , e : Int
    , h : Int
    , l : Int
    , sp : Int
    , pc : Int
    , flags :
        { z : Bool
        , s : Bool
        , p : Bool
        , cy : Bool
        , ac : Bool
        }
    , memory : Array Int
    }


type alias CodeLocation =
    { offset : Int
    , line : Int
    , column : Int
    }


type alias AssembledCode =
    { data : Int
    , kind : String
    , location : { start : CodeLocation, end : CodeLocation }
    , breakHere : Bool
    }


type alias AssemblerError =
    { name : String
    , msg : String
    , line : Int
    , column : Int
    }


type alias BreakPointAction =
    { action : String
    , line : Int
    }



-- type AssemblerOutput = AssembledCode | AssemblerError


port load : { offset : Int, code : String, loadAddr: Int } -> Cmd msg


port run : { state : ExternalState, loadAt : Int, programState : String } -> Cmd msg


port runTill : { state : ExternalState, loadAt : Int, programState : String, pauseAt : Int } -> Cmd msg


port runOne : { state : ExternalState, offset : Int } -> Cmd msg


port debug : { state : ExternalState, nextLine : Int, programState : String } -> Cmd msg


port nextLine : Int -> Cmd msg


port editorDisabled : Bool -> Cmd msg


port updateState : { state : ExternalState } -> Cmd msg


port code : (String -> msg) -> Sub msg


port breakpoints : (BreakPointAction -> msg) -> Sub msg


port loadSuccess : ({ memory : Array Int, assembled : Array AssembledCode } -> msg) -> Sub msg


port loadError : (AssemblerError -> msg) -> Sub msg


port runSuccess : (ExternalState -> msg) -> Sub msg


port runError : (Int -> msg) -> Sub msg


port runOneSuccess : ({ status : Int, state : ExternalState } -> msg) -> Sub msg


port runOneFinished : ({ status : Int, state : Maybe ExternalState } -> msg) -> Sub msg
