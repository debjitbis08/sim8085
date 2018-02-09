port module Main exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)

import Array exposing (..)
import Bitwise exposing (..)
import Char exposing (..)
import String exposing (..)
import List

import Json.Decode as Json

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
  Html.programWithFlags { init = init, view = view, update = update, subscriptions = subscriptions }

-- MODEL
type alias Model =
  { code: String
  , error: Maybe AssemblerError
  , assembled: Array AssembledCode
  , breakpoints: List Int
  , loadAddr: Int
  , programState: ProgramState
  , accumulator: Int
  , registers: Register
  , stackPtr: Int
  , programCounter: Int
  , editingAccumulator: Bool
  , statePtr: Maybe Int
  , memory: Array Int
  , editingMemoryCell: Maybe Int
  , memoryStart: Int
  , memoryStartLarge: Int
  , memoryStartSmall: Int
  , flags: Flags
  , activeFile: String
  , openFiles: List File
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
    , registers = registers
    , stackPtr = 0
    , programCounter = 0
    , editingAccumulator = False
    , statePtr = Nothing
    , memory = Array.repeat 65536 0
    , editingMemoryCell = Nothing
    , memoryStart = 0
    , memoryStartLarge = 0
    , memoryStartSmall = 0
    , flags = flags
    , activeFile = "main.asm"
    , openFiles = [ File "main.asm" "" ]
    }, Cmd.none )

initialCode =
  """;<Program title>

jmp start

;data

;code
start: nop


hlt"""

type alias RegisterField =
  { high: Int, low: Int, editing: Bool }

type alias Register =
  { bc: RegisterField
  , de: RegisterField
  , hl: RegisterField
  }

type alias Flags =
  { s: Bool
  , z: Bool
  , ac: Bool
  , p: Bool
  , c: Bool
  }

type alias File =
  { name: String
  , code: String
  }

registers : Register
registers =
  { bc = { high = 0, low = 0, editing = False }
  , de = { high = 0, low = 0, editing = False }
  , hl = { high = 0, low = 0, editing = False }
  }

flags : Flags
flags =
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
  | LoadSucceded { statePtr: Int, memory: Array Int, assembled: Array AssembledCode }
  | LoadFailed AssemblerError
  | RunSucceded ExternalState
  | UpdateRunError Int
  | RunOneSucceded { status: Int, state: ExternalState }
  | RunOneFinished { status: Int, state: Maybe ExternalState }
  | UpdateCode String
  | PreviousMemoryPage
  | NextMemoryPage
  | ChangeMemoryStart String
  | ChangeMemoryStartSmall String
  | UpdateBreakpoints BreakPointAction
  | EditRegister String
  | SaveRegister String String
  | StopEditRegister String
  | RollbackEditRegister String
  | UpdateFlag String Bool
  | EditMemoryCell Int
  | UpdateMemoryCell String

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    Run ->
        if List.isEmpty model.breakpoints
            then (model, run { state = createExternalStateFromModel model
                             , programState = getProgramState model.programState
                             , loadAt = model.loadAddr })
            else
                let nextBreak = findPCToPause model
                in
                    case (Debug.log "Next Break" nextBreak) of
                        Nothing ->
                                (model, runTill { state = createExternalStateFromModel model
                                                , pauseAt = 65535
                                                , programState = getProgramState model.programState
                                                , loadAt = model.loadAddr })
                        Just n ->
                            if model.programState == Loaded
                            then
                                (model, runTill { state = (let s = createExternalStateFromModel model in { s | pc = model.loadAddr })
                                                , pauseAt = Debug.log "PC:" n
                                                , programState = getProgramState model.programState
                                                , loadAt = model.loadAddr })
                            else
                                (model, runTill { state = createExternalStateFromModel model
                                                , pauseAt = Debug.log "PC:" n
                                                , programState = getProgramState model.programState
                                                , loadAt = model.loadAddr })

    RunOne ->
      if model.programState == Loaded
      then
        ({ model | programState = Paused, programCounter = model.loadAddr }
        , debug { state = (let s = createExternalStateFromModel model in { s | pc = model.loadAddr })
                , nextLine = case findLineAtPC model.loadAddr (model.programCounter) model.assembled model.memory of
                              Nothing -> model.programCounter - model.loadAddr
                              Just l -> l
                , programState = getProgramState model.programState }
        )
      else
      (
        { model | programState = Running }
      , runOne { state = createExternalStateFromModel model }
      )
    Load -> (model, load { offset = model.loadAddr, code = model.code })
    RunOneSucceded res ->
      let
        updatedM = updateModelFromExternalState model res.state
        cmd = nextLine (case findLineAtPC model.loadAddr (res.state.pc) model.assembled model.memory of
                        Nothing -> model.programCounter - model.loadAddr -- Bad fallback
                        Just l -> l)
      in ({ updatedM | programState = Paused }, cmd)
    RunOneFinished res ->
      case res.state of
        Nothing -> ({ model | programState = Idle }, Cmd.none)
        Just s ->
          let updatedM = updateModelFromExternalState model s
          in ({ updatedM | programState = Idle }, Cmd.none)
    UpdateMemoryCell value ->
      let
          updatedMemory = 
            case model.editingMemoryCell of
              Nothing -> model.memory
              Just addr -> Array.set addr (strToHex value) model.memory
          updatedModel = { model | memory = updatedMemory, editingMemoryCell = Nothing }
      in
          
      ( updatedModel
      , updateState { state = createExternalStateFromModel updatedModel }
      )
    Stop -> ({ model | programState = Idle }, editorDisabled False)
    _ -> ( updateHelper msg model, Cmd.none )

updateHelper : Msg -> Model -> Model
updateHelper msg model =
  case msg of
    NoOp -> model
    UpdateCode code -> { model | code = code }
    PreviousMemoryPage -> { model | memoryStart = if model.memoryStart == 0 then 0 else model.memoryStart - 256 }
    NextMemoryPage -> { model | memoryStart = if model.memoryStart == 65536 - 128 then model.memoryStart else model.memoryStart + 256 }
    ChangeMemoryStart v ->
      let
        n = Result.withDefault 0 (String.toInt v)
      in
        { model | memoryStartLarge = n
                , memoryStart = n + model.memoryStartSmall }
    ChangeMemoryStartSmall v ->
      let
        n = Result.withDefault 0 (String.toInt v)
      in
        { model | memoryStartSmall = n
                , memoryStart = n + model.memoryStartLarge }
    LoadFailed e -> { model | error = Just e, assembled = Array.empty }
    LoadSucceded res -> { model | statePtr = Just res.statePtr
                                , memory = res.memory
                                , assembled = addBreakpointsToAssembled (Debug.log "breaks" model.breakpoints) res.assembled
                                , programCounter = model.loadAddr
                                , error = Nothing
                                , programState = Loaded }
    RunSucceded state ->
      let
        updatedM = updateModelFromExternalState model state
      in
        { updatedM | programState = Idle }
    UpdateRunError errorState -> model -- TODO: Unimplemented
    UpdateBreakpoints ba ->
      let breakpoints = if ba.action == "add"
                        then ba.line + 1 :: model.breakpoints
                        else List.filter (\b -> b /= (ba.line + 1)) model.breakpoints
      in
          { model | breakpoints = breakpoints
                  , assembled = addBreakpointsToAssembled breakpoints model.assembled }
    EditRegister name ->
      if name == "a"
          then { model | editingAccumulator = True }
          else { model | registers =
                        { bc = if name == "bc" then setRegisterEdit model.registers.bc True else model.registers.bc
                        , de = if name == "de" then setRegisterEdit model.registers.de True else model.registers.de
                        , hl = if name == "hl" then setRegisterEdit model.registers.hl True else model.registers.hl
                        }
               }
    StopEditRegister name ->
      if name == "a"
          then { model | editingAccumulator = False }
          else { model | registers =
                    { bc = if name == "bc" then setRegisterEdit model.registers.bc False else model.registers.bc
                    , de = if name == "de" then setRegisterEdit model.registers.de False else model.registers.de
                    , hl = if name == "hl" then setRegisterEdit model.registers.hl False else model.registers.hl
                    }
               }
    SaveRegister name value ->
      if name == "a"
          then { model | accumulator = strToHex value }
          else { model | registers =
                        { bc = if name == "bc" then saveRegisterEdit model.registers.bc value else model.registers.bc
                        , de = if name == "de" then saveRegisterEdit model.registers.de value else model.registers.de
                        , hl = if name == "hl" then saveRegisterEdit model.registers.hl value else model.registers.hl
                        }
               }
    RollbackEditRegister name -> model
    UpdateFlag flag value ->
      { model | flags =
                { z = if flag == "Z" then value else model.flags.z
                , s = if flag == "S" then value else model.flags.s
                , p = if flag == "P" then value else model.flags.p
                , c = if flag == "C" then value else model.flags.c
                , ac = if flag == "AC" then value else model.flags.ac
                } }
    Reset ->
      { model | registers = registers
              , flags = flags
              , memory = Array.repeat 65536 0
              , accumulator = 0
              , stackPtr = 0
              , programCounter = 0
      }
    ResetRegisters ->
      { model | registers = registers
              , accumulator = 0
              , stackPtr = 0
              , programCounter = 0
      }
    ResetFlags ->
      { model | flags = flags }
    ResetMemory ->
      { model | memory = Array.repeat 65536 0 }
    EditMemoryCell addr -> { model | editingMemoryCell = Just addr }
    UpdateMemoryCell value ->
      { model | memory =
                  case model.editingMemoryCell of
                    Nothing -> model.memory
                    Just addr -> Array.set addr (strToHex value) model.memory
              , editingMemoryCell = Nothing }
    _ -> model

findPCToPause model =
    let
        assembled = Array.toIndexedList model.assembled
        remaining = (Debug.log "assembled" (List.drop (model.programCounter - model.loadAddr + 1) assembled))
        nextBreak = List.head (List.filter (\(_, a) -> a.kind == "code" && a.breakHere) remaining)
    in
        case nextBreak of
            Nothing -> Nothing
            Just (l, _) -> Just (l + model.loadAddr - 1)

addBreakpointsToAssembled breakpoints assembled =
    Array.map (\a -> if List.member a.location.start.line breakpoints
                     then { a | breakHere = True }
                     else a
              ) assembled


updateModelFromExternalState model state =
  { model | accumulator = state.a
          , registers = readRegistersFromExternalState model.registers state
          , flags = readFlagsFromExternalState model.flags state
          , stackPtr = state.sp
          , programCounter = state.pc
          , statePtr = state.ptr
          , memory = state.memory }


updateOnLoaded programState n o =
  if programState == "Loaded" then o else n

loadCode memory code loadAddr =
  let
    codeLength = Array.length code
    startOfMemory = Array.toList (Array.slice 0 (loadAddr) memory)
    opcodes = Array.toList (Array.map (.data) code)
    restOfMemory = Array.toList (Array.slice (loadAddr + codeLength) 65536 memory)
  in
    Array.fromList (List.append (List.append startOfMemory opcodes) restOfMemory)

setRegisterEdit register isEditing =
  { high = register.high, low = register.low, editing = isEditing }

saveRegisterEdit register value =
  let
    v = strToHex value
  in
    { high = (v |> shiftRightBy 8) |> and 0xff, low = v |> and 0xff, editing = register.editing }

strToHex s =
  List.foldl (\a b -> a + b) 0
              (List.indexedMap (\i f -> (16^i) * (charToHex f))
                                (List.reverse (String.toList s)))

charToHex c =
  if Char.isDigit c
  then (Char.toCode c) - 48
  else if Char.isLower c
  then (Char.toCode c) - 97 + 10
  else (Char.toCode c) - 65 + 10

findLineAtPC : Int -> Int -> Array AssembledCode -> Array Int -> Maybe Int
findLineAtPC loadAddr pc assembled memory =
  let
    opcode = Array.get pc memory
  in
    case opcode of
      Nothing -> Nothing
      Just code ->
        case Array.get 0 (Array.filter (\c -> c.data == code) (Array.slice (pc - loadAddr) (Array.length assembled) assembled)) of
          Nothing -> Nothing
          Just a -> Just a.location.start.line

readRegistersFromExternalState registers state =
  { bc = { high = state.b, low = state.c, editing = registers.bc.editing }
  , de = { high = state.d, low = state.e, editing = registers.de.editing }
  , hl = { high = state.h, low = state.l, editing = registers.hl.editing }
  }

readFlagsFromExternalState flags state =
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
  , ptr = model.statePtr
  -- , programState = getProgramState model.programState
  }

getProgramState programState =
  case programState of
    Idle -> "Idle"
    Loaded -> "Loaded"
    Running -> "Running"
    Paused -> "Paused"





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
  div [ class "work-area" ] [
      div [ class "row" ] [
        div [ class "col-md-2" ] [
            div [] [
              div [ class "row" ] [
                  h3 [ class "col-md-7" ] [ text "Registers" ]
                , span [ class "col-md-1 glyphicon glyphicon-refresh text-danger"
                       , style [("margin", "25px 0 10px"), ("cursor", "pointer")]
                       , onClick ResetRegisters
                       ] []
              ]
            , table [ class "table table-striped" ] [
                tbody [] (showRegisters model.accumulator model.flags model.registers model.stackPtr model.programCounter model.editingAccumulator)
              ]
            ]
          , div [] [
              div [ class "row" ] [
                  h3 [ class "col-md-4" ] [ text "Flags" ]
                , span [ class "col-md-1 glyphicon glyphicon-refresh text-danger"
                       , style [("margin", "25px 0 10px"), ("cursor", "pointer")]
                       , onClick ResetFlags
                       ] []
              ]
            , table [ class "table table-striped" ] [ tbody [] (showFlags model.flags) ]
            ]
        ]
        , div [ class "col-md-5 coding-area" ] [
              div [ class "coding-area__toolbar clearfix"] [
                  div [ class "btn-toolbar coding-area__btn-toolbar pull-left" ] [
                      div [ class "btn-group" ] [
                          toolbarButton (model.programState /= Idle) "success" Load "Assemble and Load Program" "save"
                        , toolbarButton (model.programState == Idle) "warning" Stop "Stop program and return to editing" "stop"
                        , toolbarButton (model.programState /= Loaded && model.programState /= Paused) "success" Run "Run Program" "fast-forward"
                        , toolbarButton (model.programState /= Loaded && model.programState /= Paused)
                                        "success" RunOne "Run one instruction" "step-forward"
                      ]
                    , div [ class "btn-group" ] [
                        toolbarButton (model.programState /= Idle) "danger" Reset "Reset Everything" "refresh"
                      ]
                  ]
                , div [ class "coding-area__load-addr pull-right" ] [
                      text "Load at 0x"
                    , text <| toWord <| model.loadAddr
                  ]
              ]
            , ul [ class "nav nav-tabs" ]
                 -- (List.append (List.map (showOpenFileTabs model.activeFile) model.openFiles) [tabAddButton])
                 (List.map (showOpenFileTabs model.activeFile) model.openFiles)
            , div [ class "coding-area__editor-container" ] [
                  textarea [ id "coding-area__editor", value model.code ] []
              ]
          ]
        , div [ class "col-md-4" ] [
              div [ class "" ] [ showMemory model model.memory model.memoryStart model.memoryStartSmall ]
          ]
      ]
    , div [ class "row", hidden (model.programState == Idle) ] [
          div [ class "col-md-7" ] [
              div [ class "panel panel-default" ] [
                  div [ class "panel-heading" ] [ h3 [ class "panel-title" ] [ text "Assembler Output" ] ]
                , div [ class "panel-body assembled-code-area" ] [
                      case model.error of
                        Nothing -> (showAssembled model.assembled model.code)
                        Just error -> showAssemblerError error model.code
                  ]
              ]
          ]
      ]
  ]


toolbarButton isDisabled type_ msg tooltip icon =
    button [ class ("btn  btn-sm btn-" ++ type_), onClick msg, title tooltip, disabled isDisabled ] [
        span [ class ("glyphicon glyphicon-" ++ icon) ] []
    ]

tabAddButton =
    li [ class "" ] [
       button [ class "btn" ] [ span [ class "glyphicon glyphicon-plus" ] [] ]
    ]

showAssemblerError error code =
  text ("Line " ++ (toString error.line) ++ ", Column " ++ (toString error.column) ++ ": " ++ error.msg)

zipAssembledSource assembled source =
  let
    sourceLines = Array.fromList (String.split "\n" source)
    findAssembled ln =
      Array.map (\a -> { data = a.data, kind = a.kind }) (Array.filter (\c -> (c.location.start.line - 1) == ln) assembled)
  in
    Array.indexedMap (\i s -> (findAssembled i, s)) sourceLines

showAssembled assembled source =
  let
    ls = zipAssembledSource assembled source
    showSingleLine n l =
        let
            code = showCode (Tuple.first l)
        in
            tr [] [
              td [ class "assembled-code-listing__lineno-cell" ] [ text <| toString <| (n + 1) ]
            , td [ class "assembled-code-listing__opcode-cell" ] [ text  (if code == "0  " then "" else code) ]
            , td [ class "assembled-code-listing__source-cell" ] [ text (Tuple.second l) ]
            ]
  in
    table [ class "table assembled-code-listing" ] [ tbody [] (Array.toList (Array.indexedMap showSingleLine ls)) ]

showCode codes =
  let
    code = Array.map (.data) (Array.filter (\c -> c.kind == "code") codes)
    data = Array.map (.data) (Array.filter (\c -> c.kind /= "code") codes)
  in
    (String.toUpper <| toRadix 16 <| (Maybe.withDefault 0 (Array.get 0 code))) ++ "  " ++
      (Array.foldr (\a b -> (toString a) ++ " " ++ b) "" data)

onChange : (String -> msg) -> Attribute msg
onChange tagger =
  on "change" (Json.map tagger targetValue)

onKeyUp : (Int -> msg) -> Attribute msg
onKeyUp tagger =
  on "keyup" (Json.map tagger keyCode)

showRegisterNonEditable name rid { high, low, editing } =
    tr [ class "reg-display__row" ] [
        th [ scope "row" ] [ text name ]
      , td [] [
            span [] [
                span [ style [("padding-right", "3px"), ("color","#AAA")] ] [ text "0x" ]
              , span [ style [("padding-right", "3px")] ] [ text <| String.toUpper <| toByte high ]
              , span [] [ text <| String.toUpper <| toByte low ]
            ]
      ]
  ]


showRegister name rid { high, low, editing } =
  tr [ class "reg-display__row" ] [
     th [ scope "row" ] [ text name ]
   , td [ hidden editing ] [
        span [ onDoubleClick (EditRegister rid), title "Double click to edit" ] [
            span [ style [("padding-right", "3px"), ("color","#AAA")] ] [ text "0x" ]
          , span [ style [("padding-right", "3px")] ] [ text <| String.toUpper <| toByte high ]
          , span [] [ text <| String.toUpper <| toByte low ]
        ]
      , span [ class "glyphicon glyphicon-edit reg-display__edit-icon"
             , title "Click to edit"
             , onClick (EditRegister rid) ] []
    ]
   , td [ onDoubleClick (EditRegister rid), hidden (not editing) ] [
        span [ style [("padding-right", "3px")] ] [ text "0x" ]
      , input [ class "reg-display__reg-input"
              , onChange (SaveRegister rid)
              , onBlur (StopEditRegister rid)
              -- , onKeyUp (\k ->
              --            case k of
              --              10 -> StopEditRegister rid
              --              11 -> RollbackEditRegister rid)
              , value (toWord <| (high |> shiftLeftBy 8) + low)
              , title "Press tab to save"
              ] []
    ]
  ]

showAccumulator name rid { high, low, editing } =
  tr [ class "reg-display__row" ] [
     th [ scope "row" ] [ text name ]
   , td [ hidden editing ] [
        span [ onDoubleClick (EditRegister rid), title "Double click to edit" ] [
            span [ style [("padding-right", "3px"), ("color","#AAA")] ] [ text "0x" ]
          , span [ style [("padding-right", "3px")] ] [ text <| String.toUpper <| toByte high ]
          , span [] [ text <| String.toUpper <| toByte low ]
        ]
      , span [ class "glyphicon glyphicon-edit reg-display__edit-icon"
             , title "Click to edit"
             , onClick (EditRegister rid) ] []
    ]
   , td [ onDoubleClick (EditRegister rid), hidden (not editing) ] [
        span [ style [("padding-right", "3px")] ] [ text "0x" ]
      , input [ class "reg-display__acc-input"
              , onChange (SaveRegister rid)
              , onBlur (StopEditRegister rid)
              , value (toByte <| high)
              , title "Press tab to save"
              ] []
      , span [] [ text <| String.toUpper <| toByte low ]
    ]
  ]

getFlagByte flags =
  Array.foldl (\a b -> a + b) 0
              (Array.indexedMap (\i f -> (2^i) * (if f then 1 else 0))
                                (Array.fromList [flags.c, True, flags.p, False, flags.ac, False, flags.z, flags.s]))

showRegisters accumulator flags registers stackPtr programCounter editingAccumulator =
  [ showAccumulator "A/PSW" "a" { high = accumulator, low = getFlagByte flags, editing = editingAccumulator }
  , showRegister "BC" "bc" registers.bc
  , showRegister "DE" "de" registers.de
  , showRegister "HL" "hl" registers.hl
  , showRegisterNonEditable "SP" "sp" { high = (stackPtr |> shiftRightBy 8) |> and 0xff, low = stackPtr |> and 0xff, editing = False }
  , showRegisterNonEditable "PC" "pc" { high = (programCounter |> shiftRightBy 8) |> and 0xff, low = programCounter |> and 0xff, editing = False }
  ]

showFlag : String -> Bool -> Html Msg
showFlag name value =
  tr [] [
     th [ scope "row" ] [ text name ]
   , td [] [
        input [ type_ "checkbox", checked value, onCheck (UpdateFlag name) ] []
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
showOpenFileTabs activeFileName { name, code } =
    li [ class (if activeFileName == name then "active" else "") ] [
       a [ href "#" ] [ text name ]
    ]

showMemory model memory memoryStart memoryStartSmall =
  div [ class "memory-view" ] [
      div [ class "row" ] [
          h3 [ class "col-md-6" ] [ text "Memory View" ]
        , span [ class "col-md-1 glyphicon glyphicon-refresh text-danger"
               , style [("margin", "25px 0 10px"), ("cursor", "pointer")]
               , onClick ResetMemory
               ] []
      ]
    , table [ class "table memory-view__cells" ] [
          thead [] (td [] [] :: (List.map (\c -> td [] [ text <| (String.toUpper (toRadix 16 c)) ]) (List.range 0 15)))
        , tbody [] (Array.toList (showMemoryCells model memoryStart (Array.slice memoryStart (memoryStart + 256) memory)))
      ]
    , div [ class "memory-view___paginator row" ] [
          div [ class "col-sm-6" ] [
              span [ style [("font-size", "0.8em")]] [ text "Start Address at: 0x " ]
            , select [ onInput ChangeMemoryStart ] (List.map (\n -> option [ value <| toString <| n ] [ text (String.toUpper (toRadix 16 n)) ]) (List.map (\n -> n * 4352) (List.range 0 15)))
          ]
        , div [ class "col-md-6" ] [
              input [ type_ "range"
                    , Html.Attributes.min "0"
                    , Html.Attributes.max "4096"
                    , step "256"
                    , onInput ChangeMemoryStartSmall
                    , value (toString memoryStartSmall)
                    ] []
          ]
      ]
  ]

isEven n = n % 2 == 0

isOdd n = n % 2 /= 0

chunk : Int -> List a -> List (List a)
chunk k xs =
  let len = List.length xs
  in  if len > k
      then List.take k xs :: chunk k (List.drop k xs)
      else [xs]

memoryCellHighlightType model addr cell =
  if addr >= model.loadAddr && addr < (model.loadAddr + Array.length model.assembled)
  then "highlight"
  else ""

showMemoryCell : Model -> Int -> Int -> Int -> Html Msg
showMemoryCell model start col cell =
  let
    addr = start + col
  in
    td [ class ("memory-view__cell_" ++ (memoryCellHighlightType model addr cell)), title (toWord addr)
       , onDoubleClick (EditMemoryCell addr)
       ] [
         span [ hidden (addr == Maybe.withDefault -1 model.editingMemoryCell) ] [ text <| String.toUpper <| toByte <| cell ]
       , span [ hidden (addr /= Maybe.withDefault -1 model.editingMemoryCell) ] [
              input [ class "memory-view__cell__input"
                    , onChange UpdateMemoryCell
                    , value (toByte <| cell)
                    ] []
         ]
    ]

showMemoryCellRow : Model -> Int -> Int -> List Int -> Html Msg
showMemoryCellRow model start i cells = tr [] ( (th [ scope "row" ] [ text <| String.toUpper <| toThreeBytes ((start//16) + i) ]) :: (List.indexedMap (showMemoryCell model (start + i * 16)) cells))

showMemoryCells : Model -> Int-> Array Int -> Array (Html Msg)
showMemoryCells model start cells =
  Array.indexedMap (showMemoryCellRow model start) (Array.fromList (chunk 16 (Array.toList cells)))

showScalePoint value =
  li [] [ text <| toString <| value ]

toRadix : Int -> Int -> String
toRadix r n =
  let
    getChr c = if c < 10 then toString c else String.fromChar <| Char.fromCode (87+c)
    getStr b = if n < b then getChr n else (toRadix r (n//b)) ++  (getChr (n%b))
  in
    case (r>=2 && r<=16) of
      True -> getStr r
      False -> toString n

toWord n =
  if n < 16
    then ("000" ++ toRadix 16 n)
    else if n < 256 then ("00" ++ toRadix 16 n)
    else if n < 4096 then ("0" ++ toRadix 16 n) else toRadix 16 n

toThreeBytes n =
  if n < 16
    then ("00" ++ toRadix 16 n)
    else if n < 256 then ("0" ++ toRadix 16 n) else (toRadix 16 n)

toByte n =
  if n < 16
    then ("0" ++ (toRadix 16 n))
    else (toRadix 16 n)

-- Ports

type alias ExternalState =
  { a: Int
  , b: Int
  , c: Int
  , d: Int
  , e: Int
  , h: Int
  , l: Int
  , sp: Int
  , pc: Int
  , flags:
    { z: Bool
    , s: Bool
    , p: Bool
    , cy: Bool
    , ac: Bool
    }
  , memory: Array Int
  , ptr: Maybe Int
  }

type alias CodeLocation =
  { offset: Int
  , line: Int
  , column: Int
  }

type alias AssembledCode =
  { data: Int
  , kind: String
  , location: { start: CodeLocation, end: CodeLocation }
  , breakHere: Bool
  }

type alias AssemblerError =
  { name: String
  , msg: String
  , line: Int
  , column: Int
  }

type alias BreakPointAction =
  { action: String
  , line: Int
  }

-- type AssemblerOutput = AssembledCode | AssemblerError

port load : { offset: Int, code: String } -> Cmd msg
port run : { state: ExternalState, loadAt: Int, programState: String } -> Cmd msg
port runTill : { state: ExternalState, loadAt: Int, programState: String, pauseAt: Int } -> Cmd msg
port runOne : { state: ExternalState } -> Cmd msg
port debug : { state: ExternalState, nextLine: Int, programState: String } -> Cmd msg
port nextLine : Int -> Cmd msg
port editorDisabled : Bool -> Cmd msg
port updateState : { state: ExternalState } -> Cmd msg

port code : (String -> msg) -> Sub msg
port breakpoints : (BreakPointAction -> msg) -> Sub msg

port loadSuccess : ({ statePtr: Int, memory: Array Int, assembled: Array AssembledCode } -> msg) -> Sub msg
port loadError : (AssemblerError -> msg) -> Sub msg

port runSuccess : (ExternalState -> msg) -> Sub msg
port runError : (Int -> msg) -> Sub msg

port runOneSuccess : ({ status: Int, state: ExternalState } -> msg) -> Sub msg
port runOneFinished : ({ status: Int, state: Maybe ExternalState } -> msg) -> Sub msg
