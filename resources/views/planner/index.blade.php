@extends('planner.layout')

@section('content')
    @include('planner.partials.loader')
    @include('planner.partials.alert')

    <div id="app-main" class="hidden flex flex-col lg:flex-row h-screen w-screen overflow-hidden relative min-h-0">
        @include('planner.partials.map-area')
        @include('planner.partials.sidebar')
        @include('planner.partials.mobile-nav')
    </div>

    @include('planner.partials.modals')
@endsection
